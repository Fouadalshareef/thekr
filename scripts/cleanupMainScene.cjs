const fs = require('fs')

const path = 'c:\\Users\\F\\Desktop\\athkar\\albaqiyat-alsalihat\\src\\game\\scenes\\MainScene.ts'
let content = fs.readFileSync(path, 'utf8')

// Remove properties
content = content.replace(/  private btnGear!: Phaser\.GameObjects\.Container\n/g, '')
content = content.replace(/  private btnSliders!: Phaser\.GameObjects\.Container\n/g, '')
content = content.replace(/  private btnLeaf!: Phaser\.GameObjects\.Container\n/g, '')
content = content.replace(/  private btnQuran!: Phaser\.GameObjects\.Container\n/g, '')
content = content.replace(/  private arrowIcon!: Phaser\.GameObjects\.Image\n/g, '')
content = content.replace(/  private btnArrow!: Phaser\.GameObjects\.Container\n/g, '')
content = content.replace(/  private sideMenuOpen = false\n/g, '')
content = content.replace(/  private sideMenuAnimating = false\n/g, '')
content = content.replace(/  private updateBadge!: Phaser\.GameObjects\.Container\n/g, '')

// Remove buildUpdateBadge call
content = content.replace(/    this\.buildUpdateBadge\(\)\n/g, '')

// Replace buildHud completely
const buildHudStart = content.indexOf('  private buildHud(): void {')
const buildPauseButtonStart = content.indexOf('  private buildPauseButton(): void {')
if (buildHudStart !== -1 && buildPauseButtonStart !== -1) {
  content = content.slice(0, buildHudStart) + 
`  private buildHud(): void {
    // أقصى اليمين العلوي: الإيقاف أعلى عداد الجلسة بفاصل رأسي 25px على الأقل.
    this.buildPauseButton()
    this.buildSessionCounter()
    this.buildComboCounter()
    this.buildAzkarCounter()
    this.buildFocusBar()
  }

` + content.slice(buildPauseButtonStart)
}

// Remove toggleSideMenu, setSideMenuVisible, pinUpdateBadge
const toggleSideMenuRegex = /  \/\*\* فتح\/طي القائمة الجانبية.*?\n  private toggleSideMenu[\s\S]*?pinUpdateBadge\(\)\)\n  }\n/
content = content.replace(toggleSideMenuRegex, '')

const setSideMenuVisibleRegex = /  \/\*\* إظهار\/إخفاء فوري[\s\S]*?pinUpdateBadge\(\)\n  }\n/
content = content.replace(setSideMenuVisibleRegex, '')

const pinUpdateBadgeRegex = /  \/\*\* تثبيت شارة التحديث[\s\S]*?\)\n  }\n/
content = content.replace(pinUpdateBadgeRegex, '')

// Remove buildUpdateBadge
const buildUpdateBadgeRegex = /  \/\*\* إنشاء نقطة حمراء[\s\S]*?updateBadge\?\.setVisible\(false\)\n    }\)\n  }\n/
content = content.replace(buildUpdateBadgeRegex, '')

// Fix applyUiSettings
const applyUiSettingsRegex = /    this\.btnArrow\?\.setVisible\(icons\)[\s\S]*?this\.btnQuran\?\.setVisible\(icons && this\.sideMenuOpen\)\n/
content = content.replace(applyUiSettingsRegex, '')

// Remove this.toggleSideMenu(false) from handleResume
content = content.replace(/    this\.toggleSideMenu\(false\)\n/g, '')

fs.writeFileSync(path, content)
console.log('MainScene.ts cleaned up successfully.')
