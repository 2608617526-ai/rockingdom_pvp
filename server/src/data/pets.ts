// 数值配置统一在 shared 包中维护（保证前后端一致），这里重新导出以满足目录结构约定。
export { PET_DEFINITIONS, PET_LIST } from '@rockingdom/shared';
export type { PetDefinition, PetId, PetStats } from '@rockingdom/shared';
