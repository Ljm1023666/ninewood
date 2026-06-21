/**
 * migrate.js
 * 把华为云空间备忘录批量导出为 Obsidian 兼容的 Markdown
 *
 * 用法：
 *   node migrate.js
 *   node migrate.js "D:\其他路径"
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DEBUG = args.includes('--debug');
const outputArg = args.find((a) => !a.startsWith('--'));

const DEFAULT_OUTPUT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\19617',
  'Documents',
  'Obsidian Vault',
  '00-Inbox',
  '华为备忘录'
);
const OUTPUT_DIR = path.resolve(outputArg || DEFAULT_OUTPUT);
const NOTE_URL = 'https://cloud.huawei.com/home#/notepad';

// 分类 → Obsidian 文件夹前缀
const CATEGORY_MAP = {
  论AI: '02-AI',
  AI总结: '02-AI',
  杂乱: '99-杂乱',
  社会杂谈: '01-社会杂谈',
  忏悔录: '03-忏悔录',
  神性: '04-神性',
  歌词: '05-歌词',
  创业: '06-创业',
  我那转瞬即逝的语录: '07-语录',
  句: '08-句',
  九木: '09-九木',
  艺术: '10-艺术',
  旅游: '11-旅游',
  个人: '12-个人',
  生活: '13-生活',
  情感: '14-情感',
  未分类: '99-未分类',
};

function safeFilename(name) {
  return (name || '未命名')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || '未命名';
}

function categoryToFolder(cat) {
  return CATEGORY_MAP[cat] || `00-${cat || '未分类'}`;
}

function buildMarkdown(note) {
  const fm = [
    '---',
    `title: ${JSON.stringify(note.title || '未命名')}`,
    `date: ${note.date || ''}`,
    `category: ${JSON.stringify(note.category || '未分类')}`,
    'source: huawei-cloud-notepad',
    `source_id: ${JSON.stringify(note.id || '')}`,
    `migrated_at: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
  ].join('\n');
  return fm + '\n' + (note.content || '_(内容为空)_') + '\n';
}

function waitForEnter(msg) {
  console.log(msg);
  return new Promise((resolve) => {
    process.stdin.once('data', () => resolve());
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const userDataDir = path.join(OUTPUT_DIR, '.browser-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  console.log('📁 输出目录:', OUTPUT_DIR);
  console.log('🚀 启动浏览器...\n');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();
  await page.goto(NOTE_URL);
  await page.waitForLoadState('networkidle');

  // 关掉 cookie 弹窗（如果存在）
  try {
    await page.evaluate(() => {
      const close = document.querySelector('.cookie-cloud .close, .cookie-cloud .cookie-close img, .cookie-close');
      if (close) close.click();
    });
    await page.waitForTimeout(200);
  } catch {}

  // 等登录
  try {
    await page.waitForSelector('.note_item', { timeout: 8000 });
    console.log('✓ 已登录，笔记列表已加载\n');
  } catch {
    console.log('⚠️  未检测到笔记列表，请在浏览器里完成登录。');
    await waitForEnter('登录完成后按回车继续：');
    await page.waitForSelector('.note_item', { timeout: 30000 });
    console.log('✓ 笔记列表已加载\n');
  }

  // 再次关 cookie 弹窗（可能登录后才弹出）
  try {
    await page.evaluate(() => {
      const c = document.querySelector('.cookie-cloud');
      if (c) c.remove();
    });
  } catch {}

  // ===== 步骤 1：抓左侧所有分类 =====
  console.log('→ 读取左侧分类列表...');
  const categories = await page.$$eval('.category_item_name', (els) =>
    els.map((el) => el.textContent?.trim()).filter(Boolean)
  );
  console.log(`✓ 找到 ${categories.length} 个分类项:`);
  console.log('  ' + categories.join(', '));
  console.log('');

  // ===== 步骤 2：先收集"全部笔记"下的所有笔记标题 + 日期 =====
  // 点 "全部笔记"
  console.log('→ 切换到"全部笔记"...');
  await page.click('#allNote');
  await page.waitForTimeout(500);

  // 滚动到底，触发懒加载
  console.log('→ 滚动列表以触发懒加载...');
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => {
      const list = document.querySelector('.note_list_content .scrollable-container');
      if (list) list.scrollTop = list.scrollHeight;
    });
    await page.waitForTimeout(300);
  }
  // 回到顶部
  await page.evaluate(() => {
    const list = document.querySelector('.note_list_content .scrollable-container');
    if (list) list.scrollTop = 0;
  });
  await page.waitForTimeout(500);

  const allItems = await page.$$eval('.note_item', (els) =>
    els.map((el) => ({
      title: el.querySelector('.note_item_titleTxt')?.getAttribute('title') || el.querySelector('.note_item_titleTxt')?.textContent?.trim() || '',
      date: el.querySelector('.note_item_datetime')?.textContent?.trim() || '',
      id: el.getAttribute('autokey') || '',
    }))
  );

  console.log(`✓ 全部笔记: ${allItems.length} 条\n`);

  if (allItems.length === 0) {
    console.log('❌ 没找到笔记，DOM 可能又变了');
    const html = await page.content();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dom-dump.html'), html);
    await context.close();
    return;
  }

  // ===== 步骤 3：按分类循环，逐个分类抓 =====
  // 这样能保证每条笔记被正确归到它所属的分类下
  console.log('→ 按分类逐个抓取...\n');

  // 分类 ID 列表（按 DOM 里的 id / index 推断）
  const categoryTargets = await page.$$eval('.category_item', (els) =>
    els.map((el, idx) => ({
      id: el.id || '',
      index: idx,
      name: el.querySelector('.category_item_name')?.textContent?.trim() || '',
      count: parseInt(el.querySelector('.category_item_number')?.textContent?.replace(/[^\d]/g, '') || '0', 10),
    })).filter((c) => c.count > 0 && c.name !== '全部笔记' && c.name !== '我的收藏')
  );

  console.log(`将处理 ${categoryTargets.length} 个分类\n`);

  let totalOk = 0, totalFail = 0, totalSkip = 0;
  const failedNotes = [];

  for (let ci = 0; ci < categoryTargets.length; ci++) {
    const cat = categoryTargets[ci];
    const catName = cat.name;
    const folder = categoryToFolder(catName);
    fs.mkdirSync(path.join(OUTPUT_DIR, folder), { recursive: true });

    console.log(`\n[${ci + 1}/${categoryTargets.length}] 分类: ${catName} (${cat.count} 条) → ${folder}/`);

    // 点击该分类
    let clicked = false;
    for (let attempt = 0; attempt < 3 && !clicked; attempt++) {
      try {
        // 每次先尝试移除 cookie 弹窗
        await page.evaluate(() => {
          const c = document.querySelector('.cookie-cloud');
          if (c) c.remove();
        });
        await page.waitForTimeout(300);

        const handles = await page.$$('.category_item');
        for (const h of handles) {
          const name = await h.$eval('.category_item_name', (el) => el.textContent?.trim()).catch(() => '');
          if (name === catName) {
            // 用 JS 强制点击，绕开遮挡检查
            await h.evaluate((el) => el.click());
            clicked = true;
            break;
          }
        }
        if (!clicked) await page.waitForTimeout(500);
      } catch (e) {
        console.log(`  重试点击分类 ${catName} (${attempt + 1}/3): ${e.message}`);
        await page.waitForTimeout(500);
      }
    }
    if (!clicked) {
      console.log(`  ⚠️ 找不到分类 ${catName}，跳过`);
      totalSkip += cat.count;
      continue;
    }

    await page.waitForTimeout(800);

    // 滚动触发懒加载
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => {
        const list = document.querySelector('.note_list_content .scrollable-container');
        if (list) list.scrollTop = list.scrollHeight;
      });
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => {
      const list = document.querySelector('.note_list_content .scrollable-container');
      if (list) list.scrollTop = 0;
    });
    await page.waitForTimeout(500);

    // 抓这个分类下的笔记列表
    const items = await page.$$eval('.note_item', (els) =>
      els.map((el) => ({
        title: el.querySelector('.note_item_titleTxt')?.getAttribute('title') || el.querySelector('.note_item_titleTxt')?.textContent?.trim() || '',
        date: el.querySelector('.note_item_datetime')?.textContent?.trim() || '',
        id: el.getAttribute('autokey') || '',
      })).filter((it) => it.title)
    );

    console.log(`  找到 ${items.length} 条笔记`);

    // 逐条点击 + 抓正文
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // 重新定位 + 强制点击（绕开遮挡）
        const clicked = await page.evaluate((idx) => {
          // 先清掉 cookie 弹窗
          const c = document.querySelector('.cookie-cloud');
          if (c) c.remove();
          const items = document.querySelectorAll('.note_item');
          if (!items[idx]) return false;
          items[idx].click();
          return true;
        }, i);
        if (!clicked) throw new Error('note_item not found');
        await page.waitForTimeout(500);

        // 抓正文（从 .note_content 里的 .CodeMirror 提取所有行的文本）
        const content = await page.evaluate(() => {
          // 取标题
          let content = '';
          // 优先取 .note_content .CodeMirror-line span
          const lines = document.querySelectorAll('.note_content .CodeMirror-line span[role="presentation"]');
          if (lines.length > 0) {
            const paras = [];
            let currentPara = '';
            lines.forEach((line) => {
              const text = line.textContent || '';
              if (text.trim() === '') {
                if (currentPara.trim()) {
                  paras.push(currentPara.trim());
                  currentPara = '';
                }
              } else {
                currentPara += (currentPara ? '' : '') + text;
              }
            });
            if (currentPara.trim()) paras.push(currentPara.trim());
            content = paras.join('\n\n');
          }
          // 兜底：用 .note_content 的 innerText
          if (!content) {
            const c = document.querySelector('.note_content');
            content = c?.innerText?.trim() || '';
          }
          return content;
        });

        if (!content) {
          totalSkip++;
          continue;
        }

        const filename = safeFilename(`${item.date}_${item.title}`) + '.md';
        let finalPath = path.join(OUTPUT_DIR, folder, filename);
        let n = 1;
        while (fs.existsSync(finalPath)) {
          finalPath = path.join(OUTPUT_DIR, folder, filename.replace('.md', `_${n}.md`));
          n++;
        }

        fs.writeFileSync(
          finalPath,
          buildMarkdown({
            title: item.title,
            date: item.date,
            category: catName,
            id: item.id,
            content,
          })
        );

        totalOk++;
        process.stdout.write(`\r  进度 ${i + 1}/${items.length}  成功:${totalOk}  失败:${totalFail}`);
      } catch (e) {
        totalFail++;
        failedNotes.push({ category: catName, title: item.title, err: e.message });
        process.stdout.write(`\r  进度 ${i + 1}/${items.length}  成功:${totalOk}  失败:${totalFail}`);
      }
    }
  }

  console.log('\n\n' + '='.repeat(50));
  console.log(`✅ 完成: 成功 ${totalOk}  失败 ${totalFail}  跳过 ${totalSkip}`);
  console.log(`📁 输出: ${OUTPUT_DIR}`);

  if (failedNotes.length > 0) {
    console.log('\n失败条目（前 10）:');
    failedNotes.slice(0, 10).forEach((f) => {
      console.log(`  [${f.category}] ${f.title}: ${f.err}`);
    });
  }

  console.log('\n按回车关闭浏览器...');
  await waitForEnter('');
  await context.close();
}

main().catch((e) => {
  console.error('\n💥 脚本异常:', e);
  process.exit(1);
});