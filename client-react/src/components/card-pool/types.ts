/** 当前黑卡所代表的筛选范围 */
export type BlackScope = {
  /** 始终从 root 起，如 ['root']、['root','online']、['root','offline','off-l'] */
  path: string[]
  /**
   * 在 path 末端之下的叶子白名单；null 表示该层下全部叶子。
   */
  leafFilter: string[] | null
}

/** 手牌中单张实例（同一 scope 仅允许一张，见 useTableState.addToHand） */
export type HandEntry = {
  id: string
  scope: BlackScope
}
