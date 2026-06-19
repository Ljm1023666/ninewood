import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Skill {
  name: string;
  description: string;
  content: string;
  source: 'user' | 'project';
  path: string;
}

/** 从指定目录发现技能 */
function discoverSkills(
  baseDir: string,
  source: 'user' | 'project',
): Skill[] {
  const skillsDir = path.join(baseDir, '.reasonix', 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const skills: Skill[] = [];
  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      // 提取第一行作为描述（去掉 # 前缀）
      const firstLine = content.split('\n')[0] || '';
      const description = firstLine.replace(/^#\s*/, '').trim();

      skills.push({
        name: entry.name,
        description: description || entry.name,
        content,
        source,
        path: skillMdPath,
      });
    }
  } catch {
    // 权限问题，跳过
  }
  return skills;
}

/** 加载所有可用技能 */
export function loadAllSkills(): Skill[] {
  // 项目级技能
  const projectSkills = discoverSkills(process.cwd(), 'project');

  // 用户级技能
  const userSkills = discoverSkills(os.homedir(), 'user');

  return [...projectSkills, ...userSkills];
}

/** 构建技能注入系统提示 */
export function buildSkillPrompt(skills: Skill[]): string {
  if (skills.length === 0) return '';

  const sections = skills.map(
    (s) =>
      `### ${s.name} (${s.source})\n${s.content}\n---`,
  );

  return `\n【可用技能 / Skills】\n以下是对当前项目有帮助的上下文信息，在回答时请参考：\n\n${sections.join('\n')}\n`;
}
