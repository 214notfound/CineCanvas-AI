import type { SliderId } from '@/engine/sliders'

/**
 * Structured help copy for each slider, shown in the hover/click tooltip.
 * `definition`, `useCase`, and `comparison` support inline **bold** markup
 * (parsed to <strong> at render time). Kept out of components so copy can be
 * edited without touching UI code.
 */
export interface SliderHelpContent {
  /** One-line definition; may contain **bold** keywords. */
  definition: string
  /** "什么时候用" —— concrete usage scenario(s). */
  useCase: string
  /** "和 XX 的区别" —— contrast with the most easily-confused neighbor. Optional. */
  comparison?: string
}

export const sliderHelpMap: Record<SliderId, SliderHelpContent> = {
  exposure: {
    definition: '控制画面的**整体亮度**，相当于让整张照片同时变亮或变暗。',
    useCase: '照片整体偏暗或偏亮时，第一步先调这个把基础亮度调对，再处理局部细节。',
    comparison: '与对比度的区别：曝光是整体平移亮度，对比度是拉开亮暗两端的差距。',
  },
  contrast: {
    definition: '控制画面**明暗反差的强弱**，让亮的更亮、暗的更暗（或反之压平）。',
    useCase: '照片显得发灰、平淡、没有层次感时，适度提高对比度能让画面更有“骨架感”。',
    comparison: '与曝光的区别：对比度不改变整体亮度基准，只拉伸/压缩明暗两端的距离。',
  },
  highlights: {
    definition:
      '专门调整照片里**已经比较亮的那些地方**，比如天空、白墙、反光的地方，让它们里面藏的细节和层次显现出来或者变得更柔和。',
    useCase:
      '比如拍蓝天白云，云朵亮到看不出一点纹理、糊成一片白的时候，往下调高光，云彩里的层次感就能找回来，照片其他部分几乎不会跟着变。',
    comparison:
      '和白色的区别：**高光只管“已经很亮的那片区域里面看不看得清”，白色管的是“整张照片最亮的地方能有多亮”。** 如果问题是“亮的地方糊成一片看不清细节”，先试高光；如果问题是“整张照片感觉不够敞亮、不够有精神”，再去调白色。',
  },
  whites: {
    definition:
      '决定**整张照片最亮的地方能撑到多亮**，调的是照片“最白的那个点”的上限。',
    useCase:
      '照片整体感觉灰蒙蒙的、发闷、不够通透的时候，把白色往上调一点，最亮的地方会更亮，整张照片一下子会更有精神。',
    comparison:
      '和高光的区别：**白色改变的是“最亮能有多亮”这个上限，高光改变的是“已经很亮的区域里面能不能看清细节”。** 两者听起来像，但白色调过头容易让亮部糊成一片看不清，高光调整则不会有这个问题。',
  },
  shadows: {
    definition:
      '专门调整照片里**已经比较暗的那些地方**，比如阴影、逆光的脸、深色衣服的褶皱，让藏在暗处的细节显现出来。',
    useCase:
      '比如逆光拍人像，脸或者衣服暗到完全看不清楚的时候，往上调阴影，暗处的细节能被找回来，照片亮的地方基本不会变。',
    comparison:
      '和黑色的区别：**阴影只管“已经很暗的那片区域里面看不看得清”，黑色管的是“整张照片最暗的地方能有多暗”。** 如果问题是“暗的地方糊成一片看不清”，先试阴影；如果照片本身没有很暗的部分、只是整体感觉不够扎实，调黑色更合适。',
  },
  blacks: {
    definition:
      '决定**整张照片最暗的地方能压到多暗**，调的是照片“最黑的那个点”的下限。',
    useCase:
      '照片感觉发灰、没有分量、松松垮垮的时候，把黑色往下调一点，最暗的地方会更黑，照片一下子会显得更扎实、更有质感。',
    comparison:
      '和阴影的区别：**黑色改变的是“最暗能有多暗”这个下限，阴影改变的是“已经很暗的区域里面能不能看清细节”。** 黑色调过头容易让暗部糊成一片看不清任何东西，阴影调整则不会有这个问题。',
  },
  temperature: {
    definition: '控制画面偏**冷（蓝）还是偏暖（黄）**，模拟不同光源色温的效果。',
    useCase:
      '室内灯光下拍出来偏黄、或阴天拍出来偏蓝时，用色温把白色物体校正回“看起来是白色”。',
    comparison:
      '与色调的区别：**色温是黄-蓝轴，色调是绿-品红轴**，两者共同决定整体色彩倾向。',
  },
  tint: {
    definition:
      '控制画面偏**绿还是偏品红（洋红）**，常用于修正荧光灯或特殊光源导致的偏色。',
    useCase: '皮肤发绿或整体画面有一层怪异的品红/绿色调时，用这个校正回自然肤色。',
    comparison:
      '与色温的区别：**色调是绿-品红轴，色温是黄-蓝轴**，两个轴垂直，配合使用可以精确校色。',
  },
  vibrance: {
    definition:
      '**智能地**提升色彩鲜艳度，对已经很鲜艳的颜色提升幅度小，对不够鲜艳的颜色提升幅度大，并且会**保护肤色**不被过度饱和。',
    useCase:
      '想让照片“好看一点”又不想显得假、不想让人脸看起来像涂了腮红时，优先用这个而不是饱和度。',
    comparison:
      '与饱和度的区别：**自然饱和度是“挑着提”，饱和度是“雨露均沾”**，人像/含肤色的照片优先调自然饱和度。',
  },
  saturation: {
    definition: '对画面**所有颜色**同等幅度地增强或减弱鲜艳程度，不分青红皂白。',
    useCase:
      '风光照、静物照这类不含人物肤色、想要浓郁色彩效果时可以用，但要注意过量会显得“艳俗”。',
    comparison:
      '与自然饱和度的区别：**饱和度是无差别地全局增强，容易让肤色和天空这类本就鲜艳的区域过曝色**，人像照片慎用。',
  },
}
