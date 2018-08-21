export default function wrapper (ViewBacking) {
  // Used only in dev mode, by dev tools, for various purposes.
  class DebugViewBacking extends ViewBacking {
    wrapRender (ctx, parentTransform, parentOpacity) {
      super.wrapRender(ctx, parentTransform, parentOpacity);

      if (!this.__highlighting)
        return;

      // Apply global transform
      var gt = this._globalTransform;
      ctx.setTransform(gt.a, gt.b, gt.c, gt.d, gt.tx, gt.ty);

      // Render bounding box
      ctx.fillStyle = DebugViewBacking.HIGHLIGHT_STYLE;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    __highlight (val) {
      this.__highlighting = val;
    }
  }

  DebugViewBacking.HIGHLIGHT_STYLE = 'rgba(0, 0, 255, 0.6)';

  return DebugViewBacking;
}
