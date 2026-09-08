/** أنواع مشتركة لإعداد اللعبة. */
export interface PhaserGameConfig {
  /** العنصر الأب الذي يُركّب فيه قماش Phaser (id or selector). */
  parent?: string | HTMLElement
  width?: number
  height?: number
}
