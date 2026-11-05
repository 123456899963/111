"""Alembic 迁移脚本通用模板"""
import sqlalchemy as sa
from alembic import op


revision = "000000000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """下次 autogenerate 后填入实际 DDL"""
    pass


def downgrade() -> None:
    """下次 autogenerate 后填入实际回滚"""
    pass
