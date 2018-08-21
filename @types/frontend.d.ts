declare module "frontend/devkit-core/timestep/src/event/Emitter" {
    export default class Emitter {
        // TODO: describe args better
        publish(a?: any, b?: any, c?: any);
        subscribe(evtName: string, emitter: Emitter, cb: Function);    
    }
}

declare interface ILooseObject {
    [key: string]: any;
}

declare interface IBoundary {
    x: number;
    y: number;
    width: number;
    height: number;
}

declare interface IPositionInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    r: number;
    anchorX: number;
    anchorY: number;
    scale: number;
}

declare module "frontend/devkit-core/timestep/src/ui/View" {
    import Emitter from "frontend/devkit-core/timestep/src/event/Emitter";

    import { mvcClass } from 'src/mvc';

    export default class View extends Emitter {
        public mvc: mvcClass;
        public style: ILooseObject;
        public tick: Function;

        constructor(opts: object);
        removeSubview(View);
        addSubview(View);
        getAssets(): Array<string>;
        getInput(): any;
        hide(opts?: any): void;
        getPosition(parentView: View): IPositionInfo;
        getSuperview(): View;
        getResourcesToPreload(): any;
        getSubviews(): Array<View>;
    }
}

declare module "frontend/devkit-core/timestep/src/ui/ScrollView" {
    import View from "frontend/devkit-core/timestep/src/ui/View";

    export default class ScrollView extends View {
        constructor(opts: object);

        setScrollBounds(opts: object);
        setOffset(x: number, y: number);
        getOffsetY(): number;
        getOffsetX(): number;
    }
}

declare module "frontend/devkit-core/timestep/src/ui/ImageView" {
    import View from "frontend/devkit-core/timestep/src/ui/View";

    export default class ImageView extends View {
        constructor(opts: object);
        setImage(path: string, opts?: object): void;
        getImage(): any;
        setFilter(filter: object);
        autoSize(): void;

        // TSL: this doesn't actually exist in ImageView. ET code references it; exposing it for legacy for now.
        dialog: any;
    }
}

declare module "frontend/devkit-core/timestep/src/ui/ImageScaleView" {
    import View from "frontend/devkit-core/timestep/src/ui/View";

    export default class ImageScaleView extends View {
        constructor(opts: object);
        autoSize(): void;
    }
}

declare module "src/lib/FBPhotoImage" {
    import ImageView from "frontend/devkit-core/timestep/src/ui/ImageView";

    export default class FBPhotoImage extends ImageView {
       setMask(any): void;
    }
}

declare module "src/lib/ButtonView" {
    import ImageScaleView from "frontend/devkit-core/timestep/src/ui/ImageScaleView";

    export default class ButtonView extends ImageScaleView {
        autoSize(): void;
    }
}

declare module "frontend/devkit-core/timestep/src/ui/bitmapFont/BitmapFontTextView" {
    import View from "frontend/devkit-core/timestep/src/ui/View";

    export default class BitmapFontTextView extends View {
        text: string;

        updateOpts(opts: object);
    }
}

declare module "frontend/devkit-core/timestep/src/AudioManager" {
    import Emitter from "frontend/devkit-core/timestep/src/event/Emitter";

    export default class AudioManager extends Emitter {
        constructor (opts: object);
        play(string): void;
        playBackgroundMusic(string): void;
        pauseBackgroundMusic(): void;
        stop(string): void;
        setEffectsMuted(boolean): void;
        setMusicMuted(boolean): void;
    }
}

declare module "frontend/devkit-core/timestep/src/platforms/browser/Canvas" {
    export default class Canvas {
        constructor(opts: object);
        toDataURL(string, number): any;
        getContext(string): any;
        width: number;
        height: number;    
    }
}

declare module "frontend/devkit-core/timestep/src/movieclip/MovieClip" {
    export default class MovieClip {
        style: any;

        constructor(opts?: object);
        play(animationName: string, callback?: Function, loop?:boolean): void;
        stop();
        static animationLoader: Function; 
        _forceLoad();
    }
}
