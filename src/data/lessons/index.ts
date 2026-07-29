import type { LessonDef } from './types'

export const LESSONS: LessonDef[] = [
  {
    id: 'l1-exposure-whites-highlights',
    order: 1,
    title: '曝光 vs 白色 vs 高光',
    blurb: '都让亮部变亮，但动的是「整张图 / 最白端点 / 已亮区域」。',
    compareLine:
      '三者都会让画面变亮，但曝光是整体平移；白色推最亮的端点；高光只抬已经偏亮的区域。',
    imageSrc: '/learn/l1-sky.jpg',
    allowedSliders: ['exposure', 'whites', 'highlights'],
    practiceHint:
      '先把三个滑块都归零，再分别拖到约 +50，用「对比原图」和直方图看山怎么动。',
    quiz: {
      intro: '下面三张都是同一张诊断图加了不同参数。凭感觉选出对应项。',
      options: [
        {
          id: 'exp',
          recipe: { exposure: 50 },
          revealLabel: '曝光 +50（整体变亮）',
        },
        {
          id: 'whites',
          recipe: { whites: 55 },
          revealLabel: '白色 +55（推最白端点）',
        },
        {
          id: 'hi',
          recipe: { highlights: 70 },
          revealLabel: '高光 +70（抬已亮区域）',
        },
      ],
      questions: [
        {
          id: 'q-exp',
          prompt: '哪一张主要是「整张图一起变亮」？',
          correctOptionId: 'exp',
        },
        {
          id: 'q-whites',
          prompt: '哪一张更像「把最白的地方再往外推」？',
          correctOptionId: 'whites',
        },
        {
          id: 'q-hi',
          prompt: '哪一张更像「只照顾已经偏亮的区域」？',
          correctOptionId: 'hi',
        },
      ],
    },
    nextId: 'l2-shadows-blacks',
  },
  {
    id: 'l2-shadows-blacks',
    order: 2,
    title: '阴影 vs 黑色',
    blurb: '暗部：救内容 vs 压最黑下限。',
    compareLine:
      '阴影抬的是暗部里的内容；黑色动的是「最黑能有多黑」——压下去发闷，抬起来像褪色灰雾。',
    imageSrc: '/learn/l2-backlight.jpg',
    allowedSliders: ['shadows', 'blacks'],
    practiceHint:
      '试阴影 +60 看暗部细节是否出来；再归零试黑色 −50 / +50，感受下限在动。',
    quiz: {
      intro: '两张图分别动了阴影或黑色。选出对应项。',
      options: [
        {
          id: 'shadows',
          recipe: { shadows: 65 },
          revealLabel: '阴影 +65（救暗部内容）',
        },
        {
          id: 'blacks',
          recipe: { blacks: -55 },
          revealLabel: '黑色 −55（压最黑下限）',
        },
      ],
      questions: [
        {
          id: 'q-shadows',
          prompt: '哪一张更像「把暗处里的东西救出来」？',
          correctOptionId: 'shadows',
        },
        {
          id: 'q-blacks',
          prompt: '哪一张更像「把最黑压得更死、反差更硬」？',
          correctOptionId: 'blacks',
        },
      ],
    },
    nextId: 'l4-vibrance-saturation',
  },
  {
    id: 'l4-vibrance-saturation',
    order: 3,
    title: '自然饱和度 vs 饱和度',
    blurb: '挑着提颜色，还是雨露均沾（肤色更易伤）。',
    compareLine:
      '饱和度一视同仁地加浓；自然饱和度优先照顾淡的颜色，对已鲜艳的区域（含肤色）更手下留情。',
    imageSrc: '/learn/l4-portrait.jpg',
    allowedSliders: ['vibrance', 'saturation'],
    practiceHint:
      '分别把自然饱和度与饱和度拖到 +60，看肤色区和背景彩色谁先「假」。',
    quiz: {
      intro: '两张都加了饱和类参数。哪张更「挑着提」？',
      options: [
        {
          id: 'vib',
          recipe: { vibrance: 70 },
          revealLabel: '自然饱和度 +70',
        },
        {
          id: 'sat',
          recipe: { saturation: 55 },
          revealLabel: '饱和度 +55',
        },
      ],
      questions: [
        {
          id: 'q-vib',
          prompt: '哪一张肤色相对更克制、背景更跳？',
          correctOptionId: 'vib',
        },
        {
          id: 'q-sat',
          prompt: '哪一张整体（含肤色）都更浓、更易发假？',
          correctOptionId: 'sat',
        },
      ],
    },
    nextId: 'l5-temp-tint',
  },
  {
    id: 'l5-temp-tint',
    order: 4,
    title: '色温 vs 色调',
    blurb: '黄-蓝轴 vs 绿-品红轴。',
    compareLine:
      '色温走黄↔蓝；色调走绿↔品红。都叫「白平衡」，但是两条垂直的轴。',
    imageSrc: '/learn/l5-cast.jpg',
    allowedSliders: ['temperature', 'tint'],
    practiceHint:
      '先只拖色温看冷暖；归零后再只拖色调看绿/品红。最后两个一起微调「纠偏」。',
    quiz: {
      intro: '两张分别偏了色温或色调。',
      options: [
        {
          id: 'temp',
          recipe: { temperature: 55 },
          revealLabel: '色温 +55（偏暖黄）',
        },
        {
          id: 'tint',
          recipe: { tint: 50 },
          revealLabel: '色调 +50（偏品红）',
        },
      ],
      questions: [
        {
          id: 'q-temp',
          prompt: '哪一张更偏黄/暖？',
          correctOptionId: 'temp',
        },
        {
          id: 'q-tint',
          prompt: '哪一张更偏品红（紫红）？',
          correctOptionId: 'tint',
        },
      ],
    },
    nextId: null,
  },
]

export function getLesson(id: string): LessonDef | undefined {
  return LESSONS.find((l) => l.id === id)
}

export function listLessons(): LessonDef[] {
  return [...LESSONS].sort((a, b) => a.order - b.order)
}
