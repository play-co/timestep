export default class BitmapChar {

  /** Creates a char with a texture and its properties. */
  constructor (id, textureData, xOffset, yOffset, xAdvance) {
    this.charID = id;
    this.textureData = textureData;
    this.xOffset = xOffset;
    this.yOffset = yOffset;
    this.xAdvance = xAdvance;
    this.kernings = {};
  }

  /** Adds kerning information relative to a specific other character ID. */
  addKerning (charID, amount) {
    this.kernings[charID] = amount;
  }

  /** Retrieve kerning information relative to the given character ID. */
  getKerning (charID) {
    return this.kernings[charID] || 0;
  }

  /** The width of the character in points. */
  get width () {
    if (!this.textureData) {
      return 0;
    }
    return this.textureData.sourceW / this.textureData.parentW;
  }

  /** The height of the character in points. */
  get height () {
    if (!this.textureData) {
      return 0;
    }
    return this.textureData.sourceH / this.textureData.parentH;
  }

}
