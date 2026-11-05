/* ============================================================
   Mock 数据 —— 茶·图鉴
   全局挂载: window.TEA_MOCK
   所有数据独立于此文件，HTML/JS 仅引用，不写死
   图片来源: Unsplash CDN（需联网访问）
   ============================================================ */

(function () {
  // ---------- 六大茶类枚举 ----------
  const CATEGORIES = [
    { key: 'green',  name: '绿茶',    color: '#5CB85C', emoji: '🍃' },
    { key: 'white',  name: '白茶',    color: '#D4D0C8', emoji: '🫖' },
    { key: 'yellow', name: '黄茶',    color: '#E6C25B', emoji: '🌼' },
    { key: 'red',    name: '红茶',    color: '#C0392B', emoji: '☕' },
    { key: 'oolong', name: '乌龙茶',  color: '#D35400', emoji: '🍵' },
    { key: 'dark',   name: '黑茶',    color: '#4A3728', emoji: '🫗' },
  ];

  // ---------- 产地枚举 ----------
  const ORIGINS = [
    '浙江', '福建', '云南', '江苏', '安徽', '四川',
    '湖南', '湖北', '广东', '贵州', '江西', '台湾',
    '山东', '陕西', '广西',
  ];

  // ---------- 采摘季节枚举 ----------
  const SEASONS = ['明前', '雨前', '春茶', '夏茶', '秋茶', '冬茶'];

  // ---------- 30 条茶品 Mock 数据 ----------
  const TEAS = [
    // 绿茶 × 6
    {
      id: 1, name: '西湖龙井', category: 'green', origin: '浙江 杭州 西湖狮峰',
      season: '明前', favoriteCount: 2480,
      imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop',
      shape: '扁平光滑，色翠略黄，形似雀舌',
      soup: '嫩绿明亮，清澈见底',
      aroma: '豆香清雅，热香馥郁，冷香幽兰',
      taste: '鲜爽甘醇，回甘明显，有淡淡的板栗香',
      waterTemp: 85, teaAmount: 3, brewTime: 90,
      tips: {
        history: '西湖龙井始于唐代，是中国十大名茶之首，狮峰产区为核心原产地。',
        suitable: '适合脾胃强健、喜鲜爽口感的茶友；春季饮用尤佳。',
        misconception: '水温不宜过高，85℃即可，沸水会烫熟嫩芽导致苦涩。',
        officialNote: '采摘标准为一芽一叶或一芽二叶初展，炒制工艺独特，有"抖、挺、扣、抓、压、磨"十大手法。'
      }
    },
    {
      id: 2, name: '碧螺春', category: 'green', origin: '江苏 苏州 洞庭山',
      season: '明前', favoriteCount: 1890,
      imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&h=400&fit=crop',
      shape: '纤细卷曲如螺蛳，满披白毫，银绿隐翠',
      soup: '嫩绿透亮，有花果香',
      aroma: '花果香浓郁，鲜爽持久',
      taste: '鲜醇甘浓，口感细腻，有明显的花果香',
      waterTemp: 80, teaAmount: 2.5, brewTime: 90,
      tips: {
        history: '碧螺春原名"吓煞人香"，清代康熙皇帝南巡时改名为碧螺春。',
        suitable: '适合初学者，入口友好，鲜爽不苦涩。',
        misconception: '碧螺春不宜用沸水，80℃左右最佳，先注水后投茶。'
      }
    },
    {
      id: 3, name: '黄山毛峰', category: 'green', origin: '安徽 黄山',
      season: '明前', favoriteCount: 1320,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop',
      shape: '形似雀舌，翠绿中带微黄，银毫显露',
      soup: '清澈明亮，嫩绿泛黄',
      aroma: '清香持久，似兰花香',
      taste: '鲜爽回甘，滋味醇厚',
      waterTemp: 85, teaAmount: 3, brewTime: 90,
      tips: {
        history: '黄山毛峰是中国十大名茶之一，产于安徽黄山海拔 700-800 米山区。',
      }
    },
    {
      id: 4, name: '安吉白茶', category: 'green', origin: '浙江 湖州 安吉',
      season: '明前', favoriteCount: 2150,
      imageUrl: 'https://images.unsplash.com/photo-1547825972-9d9f3c2e6e5e?w=600&h=400&fit=crop',
      shape: '条索自然，白毫显露，色白如玉',
      soup: '鹅黄嫩绿，明亮清澈',
      aroma: '兰花清香',
      taste: '鲜爽甘醇，氨基酸含量高，特别鲜',
      waterTemp: 80, teaAmount: 2.5, brewTime: 90,
      tips: {
        suitable: '氨基酸含量是普通绿茶的 2-3 倍，特别适合需要提神的人群。',
        misconception: '安吉白茶是绿茶，不是白茶！它是一个特殊的茶树品种。'
      }
    },
    {
      id: 5, name: '太平猴魁', category: 'green', origin: '安徽 黄山 太平',
      season: '谷雨前', favoriteCount: 980,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&h=400&fit=crop',
      shape: '两叶抱一芽，扁平挺直，自然舒展，如兰花瓣',
      soup: '清绿明亮',
      aroma: '兰花香高长',
      taste: '鲜爽醇厚，回甘持久',
      waterTemp: 85, teaAmount: 3, brewTime: 120,
      tips: {
        history: '太平猴魁曾获巴拿马万国博览会金奖，有"猴魁两头尖，不散不翘不卷边"之称。',
      }
    },
    {
      id: 6, name: '信阳毛尖', category: 'green', origin: '河南 信阳',
      season: '春茶', favoriteCount: 1560,
      imageUrl: 'https://images.unsplash.com/photo-1588164856586-58bf4d4f405f?w=600&h=400&fit=crop',
      shape: '细圆紧直，色泽翠绿，白毫显露',
      soup: '嫩绿明亮',
      aroma: '清香持久',
      taste: '鲜爽回甘，有熟板栗香',
      waterTemp: 85, teaAmount: 3, brewTime: 90,
      tips: {}
    },

    // 白茶 × 5
    {
      id: 7, name: '白毫银针', category: 'white', origin: '福建 福鼎',
      season: '明前', favoriteCount: 1280,
      imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&h=400&fit=crop',
      shape: '芽头肥壮，满披白毫，色白如银',
      soup: '浅杏黄色，清澈透亮',
      aroma: '毫香显著，有清甜味',
      taste: '清淡回甘，毫味足，有特殊的"香韵"',
      waterTemp: 90, teaAmount: 3, brewTime: 120,
      tips: {
        history: '白毫银针是白茶中的极品，全部由芽头制成，每公斤约需 2.5 万个芽头。',
        suitable: '适合胃寒人群，白茶性温，有养胃之效。',
        officialNote: '白茶是"一年茶，三年药，七年宝"，陈化后价值倍增。'
      }
    },
    {
      id: 8, name: '白牡丹', category: 'white', origin: '福建 政和',
      season: '春茶', favoriteCount: 860,
      imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&h=400&fit=crop',
      shape: '一芽一二叶，绿叶夹银白色毫心，形似花朵',
      soup: '杏黄色，明亮',
      aroma: '毫香浓郁，带花香',
      taste: '醇厚清甜，比银针更有层次',
      waterTemp: 90, teaAmount: 4, brewTime: 120,
      tips: {}
    },
    {
      id: 9, name: '老白茶（寿眉）', category: 'white', origin: '福建 福鼎',
      season: '陈茶 5 年', favoriteCount: 720,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '叶态自然，色泽暗褐或古铜色',
      soup: '琥珀色，透亮有光泽',
      aroma: '陈香浓郁，有药香和枣香',
      taste: '醇厚顺滑，有陈味，回甘明显',
      waterTemp: 100, teaAmount: 5, brewTime: 180,
      tips: {
        suitable: '老白茶性温，适合秋冬季节饮用，有驱寒暖身之效。',
        misconception: '老白茶需要用沸水才能泡出味道，温度低了出不来。'
      }
    },
    {
      id: 10, name: '新贡眉', category: 'white', origin: '福建 建阳',
      season: '春茶', favoriteCount: 420,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '芽叶连枝，形似眉毛',
      soup: '浅杏黄',
      aroma: '清香带毫香',
      taste: '清甜鲜爽',
      waterTemp: 90, teaAmount: 4, brewTime: 120,
      tips: {}
    },
    {
      id: 11, name: '云南大白茶', category: 'white', origin: '云南 景谷',
      season: '春茶', favoriteCount: 310,
      imageUrl: 'https://images.unsplash.com/photo-1597318281260-2376cdab2034?w=600&h=400&fit=crop',
      shape: '芽头粗壮，白毫浓密',
      soup: '杏黄明亮',
      aroma: '清香高扬',
      taste: '醇厚回甘',
      waterTemp: 90, teaAmount: 4, brewTime: 120,
      tips: {}
    },

    // 黄茶 × 4
    {
      id: 12, name: '君山银针', category: 'yellow', origin: '湖南 岳阳 君山',
      season: '春茶', favoriteCount: 890,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '芽头肥壮，紧实挺直，芽尖金黄',
      soup: '杏黄明亮，冲泡后芽尖竖立',
      aroma: '清香高长',
      taste: '鲜爽甘醇',
      waterTemp: 90, teaAmount: 3, brewTime: 120,
      tips: {
        history: '君山银针与白毫银针齐名，但属于黄茶类，核心区别是黄茶经过焖黄工艺。',
      }
    },
    {
      id: 13, name: '蒙顶黄芽', category: 'yellow', origin: '四川 雅安 蒙顶山',
      season: '明前', favoriteCount: 560,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '芽叶匀齐，色泽黄润',
      soup: '黄亮清澈',
      aroma: '清香带甜香',
      taste: '醇厚回甘',
      waterTemp: 85, teaAmount: 3, brewTime: 120,
      tips: {
        history: '蒙顶山是中国茶文化发源地之一，有"扬子江心水，蒙山顶上茶"之说。',
      }
    },
    {
      id: 14, name: '霍山黄芽', category: 'yellow', origin: '安徽 霍山',
      season: '春茶', favoriteCount: 420,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '条索紧细，色泽黄润',
      soup: '黄亮',
      aroma: '栗香浓郁',
      taste: '醇厚鲜爽',
      waterTemp: 85, teaAmount: 3, brewTime: 120,
      tips: {}
    },
    {
      id: 15, name: '雅安黄茶', category: 'yellow', origin: '四川 雅安',
      season: '春茶', favoriteCount: 280,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '芽叶连枝，色泽金黄',
      soup: '金黄明亮',
      aroma: '陈香带甜',
      taste: '醇厚甘滑',
      waterTemp: 90, teaAmount: 4, brewTime: 150,
      tips: {}
    },

    // 红茶 × 5
    {
      id: 16, name: '正山小种', category: 'red', origin: '福建 武夷山 桐木关',
      season: '春茶', favoriteCount: 1980,
      imageUrl: 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=600&h=400&fit=crop',
      shape: '条索紧结，乌黑油润',
      soup: '红艳明亮',
      aroma: '松烟香 + 桂圆香（传统工艺）',
      taste: '醇厚甘爽，有独特的松烟味',
      waterTemp: 100, teaAmount: 5, brewTime: 180,
      tips: {
        history: '正山小种是世界红茶的鼻祖，由福建武夷山桐木关茶农发明，17 世纪传入欧洲。',
        suitable: '适合冬日暖饮，也适合调饮奶茶。',
        misconception: '正山小种的松烟香是传统工艺特征，不是"烟味"或品质问题。'
      }
    },
    {
      id: 17, name: '祁门红茶', category: 'red', origin: '安徽 祁门',
      season: '春茶', favoriteCount: 1420,
      imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&h=400&fit=crop',
      shape: '条索紧细，色泽乌润',
      soup: '红艳明亮',
      aroma: '蜜糖香 + 花香（祁门香）',
      taste: '鲜醇甘厚，回甘持久',
      waterTemp: 95, teaAmount: 4, brewTime: 150,
      tips: {
        history: '祁门红茶是"世界三大高香红茶"之一，英国王室特供，被誉为"茶中英豪"。',
      }
    },
    {
      id: 18, name: '金骏眉', category: 'red', origin: '福建 武夷山',
      season: '明前', favoriteCount: 2240,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '条索紧细，金黄黑相间，有白毫',
      soup: '金黄明亮',
      aroma: '花香、果香、蜜香三香一体',
      taste: '甘甜顺滑，几乎无苦涩，汤色"金圈"明显',
      waterTemp: 95, teaAmount: 3, brewTime: 150,
      tips: {
        history: '金骏眉是 2005 年由正山小种创新工艺研发的高端红茶，全部使用芽头制作。',
        suitable: '适合初次接触红茶的茶友，入口友好，甘甜不苦。',
      }
    },
    {
      id: 19, name: '滇红功夫', category: 'red', origin: '云南 凤庆',
      season: '春茶', favoriteCount: 1130,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '条索紧细，乌润有光',
      soup: '红艳明亮',
      aroma: '花果香浓郁',
      taste: '醇厚浓烈，回甘强',
      waterTemp: 100, teaAmount: 5, brewTime: 180,
      tips: {
        suitable: '茶味浓烈，适合喜欢"厚重感"的茶友，也适合加奶调饮。',
      }
    },
    {
      id: 20, name: '英德红茶', category: 'red', origin: '广东 英德',
      season: '秋茶', favoriteCount: 680,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '条索紧结，乌润',
      soup: '红艳明亮',
      aroma: '花香高扬',
      taste: '醇厚甘爽',
      waterTemp: 100, teaAmount: 5, brewTime: 180,
      tips: {}
    },

    // 乌龙茶 × 5
    {
      id: 21, name: '大红袍', category: 'oolong', origin: '福建 武夷山 九龙窠',
      season: '春茶', favoriteCount: 3120,
      imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&h=400&fit=crop',
      shape: '条索紧结，色泽绿褐鲜润',
      soup: '橙黄明亮',
      aroma: '馥郁兰花香 + 岩骨花香',
      taste: '醇厚回甘，有明显的"岩韵"，七泡有余香',
      waterTemp: 100, teaAmount: 7, brewTime: 30,
      tips: {
        history: '大红袍是武夷山岩茶之王，母树仅存 6 株，已有 350 多年历史。',
        suitable: '适合有一定品茶经验的茶友，岩韵需要细细品味。',
        officialNote: '岩茶讲究"岩韵"——岩骨花香，醇厚回甘，是乌龙茶中最有"风骨"的品类。'
      }
    },
    {
      id: 22, name: '铁观音', category: 'oolong', origin: '福建 安溪',
      season: '春茶', favoriteCount: 2650,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop',
      shape: '颗粒紧结重实，色泽砂绿乌润，似蜻蜓头',
      soup: '金黄明亮（传统浓香型）/ 绿中带黄（清香型）',
      aroma: '兰花清香 / 浓香馥郁',
      taste: '醇厚鲜爽，"七泡有余香"',
      waterTemp: 100, teaAmount: 7, brewTime: 30,
      tips: {
        history: '铁观音有 200 多年历史，是乌龙茶中知名度最高的品种之一。',
        misconception: '铁观音有清香型和浓香型两种，前者发酵程度轻、后者发酵重，各有风味。'
      }
    },
    {
      id: 23, name: '凤凰单丛', category: 'oolong', origin: '广东 潮州 凤凰山',
      season: '春茶', favoriteCount: 1580,
      imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&h=400&fit=crop',
      shape: '条索紧结，挺直肥硕',
      soup: '橙黄明亮',
      aroma: '香气高扬，有蜜香、兰花香、栀子香等多种香型',
      taste: '浓醇甘滑，山韵明显',
      waterTemp: 100, teaAmount: 7, brewTime: 30,
      tips: {
        suitable: '凤凰单丛有"蜜兰香""鸭屎香""黄枝香"等数十种香型，是香型最丰富的乌龙茶。',
      }
    },
    {
      id: 24, name: '冻顶乌龙', category: 'oolong', origin: '台湾 南投 鹿谷',
      season: '秋茶', favoriteCount: 920,
      imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop',
      shape: '颗粒卷曲，紧结重实，色泽深绿',
      soup: '金黄明亮',
      aroma: '桂花香 + 焦糖香',
      taste: '醇厚甘滑，有明显的"冷香"',
      waterTemp: 95, teaAmount: 7, brewTime: 30,
      tips: {
        history: '冻顶乌龙产于台湾冻顶山，海拔 600-1000 米，是台湾乌龙茶的代表。',
      }
    },
    {
      id: 25, name: '东方美人', category: 'oolong', origin: '台湾 新竹',
      season: '夏茶', favoriteCount: 460,
      imageUrl: 'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop',
      shape: '芽叶连枝，白毫显露，形似花朵',
      soup: '琥珀色，明亮',
      aroma: '果香、蜂蜜香、花香混合',
      taste: '清甜甘爽，不苦不涩',
      waterTemp: 90, teaAmount: 5, brewTime: 60,
      tips: {
        history: '东方美人是唯一一种被小绿叶蝉"咬过"才制作的茶，虫咬促使茶树产生独特风味物质。',
      }
    },

    // 黑茶 × 5
    {
      id: 26, name: '普洱生茶', category: 'dark', origin: '云南 西双版纳',
      season: '春茶', favoriteCount: 1760,
      imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop',
      shape: '条索紧结，色泽墨绿（新茶），随陈化转深',
      soup: '金黄明亮（新茶）/ 琥珀红浓（老生茶）',
      aroma: '新茶清香 / 陈茶有陈香、参香',
      taste: '新茶鲜爽回甘 / 老茶醇厚顺滑',
      waterTemp: 100, teaAmount: 8, brewTime: 30,
      tips: {
        history: '普洱茶有"能喝的古董"之称，越陈越香，优质普洱可陈化数十年。',
        suitable: '生茶刺激性较强，适合胃好的茶友；陈化 5 年以上更温和。',
        officialNote: '生普与熟普的区别：生普是自然陈化，熟普是人工渥堆加速发酵。'
      }
    },
    {
      id: 27, name: '普洱熟茶', category: 'dark', origin: '云南 昆明',
      season: '陈茶 3 年', favoriteCount: 2180,
      imageUrl: 'https://images.unsplash.com/photo-1571346451091-e8c524a1b998?w=600&h=400&fit=crop',
      shape: '条索紧结，色泽红褐',
      soup: '红浓明亮，有"金圈"',
      aroma: '陈香、枣香、木香',
      taste: '醇厚顺滑，几乎无苦涩，回甘明显',
      waterTemp: 100, teaAmount: 8, brewTime: 30,
      tips: {
        suitable: '熟茶性温，适合大多数人群，尤其是胃寒或晚上想喝茶的茶友。',
        misconception: '熟茶发酵工艺 1973 年才发明，历史远短于生茶，但因其温和的口感迅速流行。'
      }
    },
    {
      id: 28, name: '安化黑茶', category: 'dark', origin: '湖南 益阳 安化',
      season: '陈茶', favoriteCount: 560,
      imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop',
      shape: '紧压茶（茯砖、花砖、黑砖）或散装',
      soup: '橙黄明亮',
      aroma: '有独特的"菌香"（金花）、木香',
      taste: '醇厚甘滑',
      waterTemp: 100, teaAmount: 8, brewTime: 60,
      tips: {
        history: '安化黑茶是"古丝绸之路"上的重要商品，曾被称为"边销茶"，专供游牧民族。',
        officialNote: '安化黑茶的"金花"（冠突散囊菌）是独特的有益益生菌。'
      }
    },
    {
      id: 29, name: '六堡茶', category: 'dark', origin: '广西 梧州 六堡',
      season: '陈茶', favoriteCount: 780,
      imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop',
      shape: '紧压或散装，色泽黑褐',
      soup: '红浓明亮',
      aroma: '陈香、槟榔香',
      taste: '醇厚甘滑，有特殊的"槟榔味"',
      waterTemp: 100, teaAmount: 8, brewTime: 60,
      tips: {
        history: '六堡茶是"红陈黑"三绝，曾远销东南亚，有"侨销茶"之称。',
      }
    },
    {
      id: 30, name: '雅安藏茶', category: 'dark', origin: '四川 雅安',
      season: '陈茶', favoriteCount: 320,
      imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop',
      shape: '紧压茶，色泽黑褐',
      soup: '红浓',
      aroma: '陈香、焦香',
      taste: '醇厚浓烈',
      waterTemp: 100, teaAmount: 10, brewTime: 60,
      tips: {
        suitable: '藏茶是藏族同胞的"民生茶"，与酥油、牛奶搭配制作酥油茶。',
      }
    },
  ];

  // ---------- 聚合工具函数 ----------
  function getCategoryCount(categoryKey) {
    return TEAS.filter(t => t.category === categoryKey).length;
  }

  function getCategoriesWithCount() {
    return CATEGORIES.map(c => ({ ...c, count: getCategoryCount(c.key) }));
  }

  function getOriginsWithCount() {
    return ORIGINS.map(o => ({
      name: o,
      count: TEAS.filter(t => t.origin.includes(o)).length,
    })).filter(o => o.count > 0);
  }

  function getTeaById(id) {
    return TEAS.find(t => t.id === Number(id));
  }

  function getTeasByCategory(categoryKey) {
    return TEAS.filter(t => t.category === categoryKey);
  }

  function getHotTeas(limit = 8) {
    return [...TEAS].sort((a, b) => b.favoriteCount - a.favoriteCount).slice(0, limit);
  }

  function getRandomTea(excludeId) {
    const pool = excludeId ? TEAS.filter(t => t.id !== excludeId) : TEAS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function searchTeas(keyword) {
    if (!keyword) return TEAS;
    const kw = keyword.trim().toLowerCase();
    return TEAS.filter(t =>
      t.name.toLowerCase().includes(kw) ||
      t.origin.toLowerCase().includes(kw)
    );
  }

  function filterTeas({ categories = [], origins = [], seasons = [] } = {}) {
    return TEAS.filter(t => {
      if (categories.length && !categories.includes(t.category)) return false;
      if (origins.length && !origins.some(o => t.origin.includes(o))) return false;
      if (seasons.length && !seasons.includes(t.season)) return false;
      return true;
    });
  }

  // 获取同类推荐（排除当前茶，按收藏数排序取前 N）
  function getRelatedTeas(tea, limit = 4) {
    if (!tea) return [];
    return TEAS.filter(t => t.category === tea.category && t.id !== tea.id)
      .sort((a, b) => b.favoriteCount - a.favoriteCount)
      .slice(0, limit);
  }

  // ---------- 挂载到全局 ----------
  window.TEA_MOCK = {
    TEAS,
    CATEGORIES,
    ORIGINS,
    SEASONS,
    getCategoryCount,
    getCategoriesWithCount,
    getOriginsWithCount,
    getTeaById,
    getTeasByCategory,
    getHotTeas,
    getRandomTea,
    searchTeas,
    filterTeas,
    getRelatedTeas,
  };
})();
