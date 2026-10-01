/* =============================================================
 * READS WITH COLIN OS — 首次启动引导 + 演示数据
 * 演示数据用于理解结构，可在 Settings 一键清空
 * ============================================================= */

import { db } from './db.js';
import { Books, Logs, Ideas, Evidence, Actions, Decisions, Principles, Connections, todayStr } from './store.js';

export async function seedIfEmpty(onEmpty) {
  const books = await db.all('books');
  if (!books.length) await onEmpty();
}

export async function loadDemoData() {
  const t = todayStr();
  const d = (n) => {
    const x = new Date(); x.setDate(x.getDate() - n);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };

  const b1 = await Books.create({
    title: '思考，快与慢', titleEn: 'Thinking, Fast and Slow', author: '丹尼尔·卡尼曼',
    year: 2011, country: '美国', category: '决策', topics: ['认知偏误', '系统一系统二'],
    status: 'reading', format: '纸质书', startDate: d(20), rating: 5,
    coreQuestion: '人的判断为什么会系统性出错？',
    coreIdeas: ['系统一快而直觉，系统二慢而理性', '可得性偏误让我们高估显著事件的概率'],
    oneLineSummary: '我们的直觉并不可靠，判断需要刻意减速。',
  });
  const b2 = await Books.create({
    title: '越过浅水区', titleEn: '', author: '卡尔·纽波特', year: 2016,
    country: '美国', category: '心智', topics: ['深度工作', '专注'],
    status: 'reading', format: '电子书', startDate: d(9), rating: 4,
    coreQuestion: '如何在碎片化时代保持深度思考？',
  });
  await Books.create({
    title: '资治通鉴（选读）', author: '司马光', year: 1084, country: '中国',
    category: '历史', topics: ['权力', '人性'], status: 'to_read', format: '纸质书',
  });

  await Logs.create({
    bookId: b1.id, date: d(1), chapter: '第 7 章', pagesFrom: 120, pagesTo: 148, minutes: 32,
    summary: '讲可得性偏误：我们判断概率时，用的是「想起来有多容易」。',
    importantIdea: '记忆的容易度被误当成事件发生的频率。',
    interpretation: '这解释了为什么我总高估飞机失事、低估糖尿病风险——媒体曝光度不同。',
    question: '如果我把重要决策都延迟 24 小时，能不能削弱这种偏误？',
    actionText: '重要决策写下来，隔天再看一次。',
  });
  await Logs.create({
    bookId: b2.id, date: d(2), chapter: '第 2 章', pagesFrom: 40, pagesTo: 66, minutes: 25,
    summary: '深度工作能力稀缺，因为它是可培养的，而大多数人不再培养。',
    importantIdea: '注意力残留会显著降低切换后的表现。',
    interpretation: '我一直以为多任务并行高效，其实只是感觉忙碌。',
  });
  await Logs.create({ bookId: b1.id, date: d(6), chapter: '第 4 章', pagesFrom: 80, pagesTo: 119, minutes: 28, summary: '锚定效应的实验与日常例子。' });

  const i1 = await Ideas.create({
    bookId: b1.id, date: d(1),
    idea: '判断概率时，人会把「想起来有多容易」误当成「发生得有多频繁」',
    interpretation: '媒体曝光度直接改写了我脑子里的概率表。',
    whyImportant: '我的投资判断和风险评估都建立在这套错误的直觉上。',
    application: '做任何概率判断前，先问：这个印象是数据还是曝光度？',
    tags: ['认知偏误', '决策'],
  });
  const i2 = await Ideas.create({
    bookId: b2.id, date: d(2),
    idea: '注意力残留：任务切换后，脑子里还留着上一件事',
    interpretation: '碎片化工作不是省钱，是在交切换税。',
    whyImportant: '我以为的多任务，其实是连续降质。',
    application: '每天留一段 90 分钟无网络时间。',
    tags: ['专注'],
  });

  const ev1 = await Evidence.create({
    type: 'author_claim', content: '卡尼曼认为：可得性启发会导致系统性概率误判。',
    source: '《思考，快与慢》第 7 章', bookId: b1.id, confidence: 4,
  });
  await Evidence.create({
    type: 'my_inference', content: '（我的推断）我的投资复盘里，至少三成判断受近期新闻影响，而非长期数据。',
    source: '个人复盘', confidence: 2,
  });

  await Actions.create({
    sourceType: 'idea', sourceId: '', action: '重要决策写下来并延迟 24 小时再定',
    category: '决策', expectedResult: '减少冲动判断', status: 'doing',
  });
  await Actions.create({
    sourceType: 'book', sourceId: b2.id, action: '每天安排 90 分钟无网络的深度工作时间',
    category: '专注', expectedResult: '每天产出一段完整思考', status: 'done',
    actualResult: '坚持了 5 天，输出明显变多', completedAt: t,
  });

  await Decisions.create({
    date: d(3), decision: '是否接下一个短期高收益但打乱节奏的项目',
    background: '对方给的价格是日常的 2.5 倍，需要连续 3 周高强度',
    facts: '当前主业已有两个长周期项目在推进',
    unknowns: '短期项目的后续合作不确定',
    assumptions: '我以为自己能并行处理',
    mentalModel: '机会成本 + 注意力残留（《越过浅水区》）',
    alternatives: '接；不接；只接一半范围',
    choice: '拒绝，改为推荐同行',
    reason: '阅读告诉我：注意力切换的隐性成本高于表面收益',
    result: '主业项目提前交付，且保持了阅读节奏',
    review: '判断对了。半年后看，那个项目的客户后续纠纷很多',
    bookId: b2.id,
  });

  await Principles.create({
    principle: '任何重要判断，先区分「我看到的频率」和「实际发生的频率」',
    sourceBookIds: [b1.id],
    conditions: '涉及概率、风险、投资的判断',
    exceptions: '已有可靠统计数据时，直接信数据',
    risks: '过度怀疑直觉可能导致决策瘫痪',
    applications: '投资评估、招聘判断、项目风险评估',
    result: '过去两个月避开了两次冲动决策',
    lastReview: t, stillValid: true, status: 'active',
  });

  // 连接：让 demo 数据展现「连接即判断」的核心价值
  await Connections.create({
    fromType: 'idea', fromId: i1.id, toType: 'idea', toId: i2.id,
    relation: 'complementary', newUnderstanding: '两本书都在说同一件事：人的「感觉高效」往往是错觉，慢下来才有质量。',
  });
  await Connections.create({
    fromType: 'evidence', fromId: ev1.id, toType: 'idea', toId: i1.id,
    relation: 'causal', newUnderstanding: '这条作者主张正是这个想法的来源——先有证据，后成观点。',
  });
  await Connections.create({
    fromType: 'idea', fromId: i1.id, toType: 'book', toId: b2.id,
    relation: 'similar', newUnderstanding: '《思考，快与慢》与《越过浅水区》在「质疑直觉」上互相印证。',
  });

  // —— 跨年演示数据（Phase 5：Personal Evolution）——
  // 用历史年份的固定日期，让 Evolution 时间线直观展示「同一个主题，几年后我的答案变了什么」。
  const y = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 主题「决策」：从直觉崇拜 → 结构优先（2023 → 2024 → 2025）
  await Ideas.create({
    bookId: '', date: y(2023, 3, 12),
    idea: '决策靠直觉和胆量就够了——年轻时我就是这么过来的，错的多但快。',
    interpretation: '那时把「敢拍板」当成能力本身。',
    whyImportant: '早期创业和投资决策的底层逻辑。',
    application: '凭感觉，果断。',
    tags: ['决策'],
  });
  await Ideas.create({
    bookId: b1.id, date: y(2024, 7, 8),
    idea: '开始为重要决策写日志：强制列出已知事实、未知、假设与备选方案。',
    interpretation: '《思考，快与慢》把我从「直觉崇拜」拉到「结构优先」。',
    whyImportant: '同样的难题，结构化之后错误率明显下降。',
    application: '任何 ≥1 周工资的决策都先写下来。',
    tags: ['决策'],
  });
  await Ideas.create({
    bookId: b1.id, date: y(2025, 11, 20),
    idea: '决策的质量不取决于胆量，而取决于事前的结构；复盘时最该追问的是「我当时假设了什么」。',
    interpretation: '从「敢不敢」进化到「假设对不对」。',
    whyImportant: '这是我对「决策」这件事三年沉淀出的核心判断。',
    application: '决策日志增加「假设」一栏，并定期回看。',
    tags: ['决策'],
  });

  // 主题「专注」：2024 跨年补充（与近期 i2 凑成 ≥2 次）
  await Ideas.create({
    bookId: '', date: y(2024, 5, 2),
    idea: '专注不是意志力，是环境设计——把手机拿走比劝自己别看更有效。',
    interpretation: '靠自律对抗干扰注定输，靠结构才能赢。',
    application: '工作时段物理隔离手机。',
    tags: ['专注'],
  });

  // 同一类选择题（高回报但打乱节奏的机会）两年后的相反答案
  await Decisions.create({
    date: y(2023, 3, 12), decision: '是否 all-in 一个看好的早期项目',
    background: '行业风口，身边人都冲', facts: '只看到上行空间', unknowns: '几乎没想',
    assumptions: '风口 = 稳赚', mentalModel: '直觉', alternatives: '全投；不投；小比例',
    choice: '重仓', reason: '别人都这么做，感觉错不了', result: '踩空，回撤惨重',
    review: '纯直觉决策的代价。', bookId: '',
  });
  await Decisions.create({
    date: y(2025, 6, 15), decision: '是否接受另一个高回报但打乱节奏的项目（复盘版）',
    background: '价格诱人，需高强度 3 周', facts: '主业已有两长周期项目', unknowns: '后续合作不确定',
    assumptions: '我可能高估自己的并行能力', mentalModel: '机会成本 + 注意力残留 + 决策日志',
    alternatives: '接；不接；半接', choice: '拒绝并推荐同行',
    reason: '用结构化判断替代直觉：隐性切换成本高于表面收益',
    result: '主业提前交付，节奏未乱', review: '同一类选择题，两年后我给出了相反但更稳的答案。', bookId: b2.id,
  });

  return true;
}
