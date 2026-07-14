import { Jieba, TfIdf } from '@node-rs/jieba'
import { dict, idf } from '@node-rs/jieba/dict'

const jieba = Jieba.withDict(dict)
jieba.loadDict(Buffer.from(['王者荣耀 300 nz', '打野 200 n', '陪玩 200 n', '代练 200 n', '上分 200 v', '对抗路 150 n'].join('\n'), 'utf-8'))
const tfidf = TfIdf.withDict(idf)

const text = '王者荣耀教学陪玩 中路郑州周边可约'
console.log('cut        :', jieba.cut(text, true).join(' / '))
console.log('cutForSearch:', jieba.cutForSearch(text, true).join(' / '))
console.log('tag        :', jieba.tag(text, true).map((t) => `${t.word}/${t.tag}`).join(' '))
console.log('keywords   :', tfidf.extractKeywords(jieba, text, 5).map((k) => k.keyword).join(' / '))
console.log('has 者荣?   :', jieba.cutForSearch(text, true).includes('者荣'))
