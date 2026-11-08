"""图片上传服务（SECURITY S-22 / S-23 / S-24）

- 分块读取，超过 5 MB 立即中止（不把整个文件读入内存后再拒绝）
- 只按魔数判定 JPEG/PNG/WebP，不信任扩展名与客户端 Content-Type
- 文件名服务端 UUID 生成；落盘路径必须位于 UPLOAD_DIR 内，防路径穿越
"""

from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings
from app.core.response import FileTooLarge, InternalError, UnsupportedMedia, ValidationError

_CHUNK_SIZE = 1024 * 1024
_SIGNATURES: tuple[tuple[bytes, str, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
)


def _detect_type(head: bytes) -> tuple[str, str] | None:
    """返回 (content_type, ext)；WebP 需同时校验 RIFF....WEBP。"""
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    for signature, content_type, ext in _SIGNATURES:
        if head.startswith(signature):
            return content_type, ext
    return None


async def save_image(file: UploadFile) -> dict:
    """校验并落盘，返回 UploadResult 所需字段（url/original_filename/size/content_type）。"""
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise FileTooLarge
        chunks.append(chunk)

    if total == 0:
        raise ValidationError

    data = b"".join(chunks)
    detected = _detect_type(data[:12])
    if detected is None:
        raise UnsupportedMedia

    content_type, ext = detected
    now = datetime.utcnow()
    relative_dir = Path(f"{now.year:04d}") / f"{now.month:02d}"
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    target_dir = (upload_root / relative_dir).resolve()

    # 防路径穿越：目录与最终文件都必须落在 uploads/ 内
    if upload_root not in target_dir.parents and target_dir != upload_root:
        raise InternalError

    filename = f"{uuid4().hex}{ext}"
    target_path = (target_dir / filename).resolve()
    if target_path.parent != target_dir:
        raise InternalError

    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(data)
    except OSError:
        raise InternalError

    url = f"/uploads/{relative_dir.as_posix()}/{filename}"
    return {
        "url": url,
        "original_filename": file.filename or "",
        "size": total,
        "content_type": content_type,
    }
