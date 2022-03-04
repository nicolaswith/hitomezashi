"use strict";
var Colors;
(function (Colors) {
    Colors["CURRENT"] = "current";
    Colors["BACKGROUND"] = "background";
    Colors["BORDER"] = "border";
    Colors["COLOR1"] = "color1";
    Colors["COLOR2"] = "color2";
})(Colors || (Colors = {}));
const hashtagPattern = [
    true,
    false,
    true,
    false,
    true,
    false,
    false,
    false,
    false
];
const crossPattern = [
    false,
    true,
    false,
    true,
    false
];
var pg;
var cm;
var cd;
class Util {
    static getInput(name) {
        return document.getElementById(name);
    }
    static toU32(color) {
        return (255 << 24) |
            (color.b << 16) |
            (color.g << 8) |
            (color.r);
    }
    static rgbToHex(color) {
        return "#" + ((1 << 24) +
            (color.r << 16) +
            (color.g << 8) +
            (color.b)).toString(16).slice(1);
    }
    static hexToRGB(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result == null)
            return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }
}
class ColorManager {
    constructor() {
        this.current = { r: 0, g: 0, b: 0 };
        this.background = { r: 0, g: 0, b: 0 };
        this.border = { r: 0, g: 0, b: 0 };
        this.color1 = { r: 0, g: 0, b: 0 };
        this.color2 = { r: 0, g: 0, b: 0 };
        this.currentColor = Colors.COLOR1;
        [Colors.BACKGROUND, Colors.BORDER, Colors.COLOR1, Colors.COLOR2].forEach(color => {
            this.chooseColor(Util.getInput(color), color);
        });
    }
    getCurrentColor() {
        return this.currentColor;
    }
    getColorRGB(color) {
        switch (color) {
            case Colors.CURRENT:
                return this.current;
            case Colors.BACKGROUND:
                return this.background;
            case Colors.BORDER:
                return this.border;
            case Colors.COLOR1:
                return this.color1;
            case Colors.COLOR2:
                return this.color2;
        }
    }
    setColorsRGB(background, border, color1, color2) {
        this.background = background;
        this.border = border;
        this.color1 = color1;
        this.color2 = color2;
        Util.getInput(Colors.BACKGROUND).value = Util.rgbToHex(background);
        Util.getInput(Colors.BORDER).value = Util.rgbToHex(border);
        Util.getInput(Colors.COLOR1).value = Util.rgbToHex(color1);
        Util.getInput(Colors.COLOR2).value = Util.rgbToHex(color2);
    }
    getColor(x, y) {
        return pg.blocks[y][x].color;
    }
    setColor(color) {
        this.currentColor = color;
        switch (color) {
            case Colors.BACKGROUND:
                this.current = this.background;
                break;
            case Colors.BORDER:
                this.current = this.border;
                break;
            case Colors.COLOR1:
                this.current = this.color1;
                break;
            case Colors.COLOR2:
                this.current = this.color2;
                break;
        }
    }
    chooseColor(elem, id) {
        let color = Util.hexToRGB(elem.value);
        switch (id) {
            case Colors.BACKGROUND:
                this.background = color;
                break;
            case Colors.BORDER:
                this.border = color;
                break;
            case Colors.COLOR1:
                this.color1 = color;
                break;
            case Colors.COLOR2:
                this.color2 = color;
                break;
        }
    }
}
class CanvasDrawer {
    constructor(canvas) {
        this.xSize = 0;
        this.ySize = 0;
        this.fillingSize = 0;
        this.blockSize = 0;
        this.borderSize = 0;
        this.borderRadius = 0;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.pixelArray = new Uint32Array(0);
    }
    getFillingSize() {
        return this.fillingSize;
    }
    getBorderSize() {
        return this.borderSize;
    }
    setSizes(fillingSize, borderSize) {
        this.fillingSize = this.checkValue("fillingSize", fillingSize, 2);
        this.borderSize = this.checkValue("borderSize", borderSize, 2);
        this.blockSize = this.fillingSize + this.borderSize;
        this.borderRadius = this.borderSize / 2;
    }
    setCanvasSize(xMax, yMax) {
        this.xSize = xMax * (this.fillingSize + this.borderSize) + this.borderSize;
        this.ySize = yMax * (this.fillingSize + this.borderSize) + this.borderSize;
        this.canvas.width = this.xSize;
        this.canvas.height = this.ySize;
        Util.getInput("xSize").valueAsNumber = this.xSize;
        Util.getInput("ySize").valueAsNumber = this.ySize;
    }
    checkValue(name, value, minValue) {
        if (value < minValue) {
            Util.getInput(name).valueAsNumber = minValue;
            return minValue;
        }
        else if (value % 2 != 0) {
            let newValue = Math.floor(value / 2) * 2;
            Util.getInput(name).valueAsNumber = newValue;
            return newValue;
        }
        return value;
    }
    downloadAsImage() {
        let data = this.canvas.toDataURL("image/png");
        let downloadLink = document.createElement("a");
        downloadLink.setAttribute("download", "hitomezashi.png");
        downloadLink.setAttribute("href", data);
        downloadLink.click();
    }
    initPixelArray(colored) {
        this.pixelArray = new Uint32Array(this.xSize * this.ySize);
        if (!colored) {
            this.pixelArray.fill(Util.toU32(cm.getColorRGB(Colors.BACKGROUND)));
        }
    }
    redraw() {
        this.ctx.putImageData(new ImageData(new Uint8ClampedArray(this.pixelArray.buffer), this.xSize, this.ySize), 0, 0);
    }
    drawRect(xStart, yStart, xLen, yLen) {
        for (let y = yStart; y < yStart + yLen; y++) {
            let yOffset = y * this.xSize;
            for (let x = xStart; x < xStart + xLen; x++) {
                this.pixelArray[yOffset + x] = Util.toU32(cm.getColorRGB(Colors.CURRENT));
            }
        }
    }
    drawCirc(xStart, yStart, orientation) {
        let yEnd = yStart + this.borderRadius + ((orientation == "hs" || orientation == "he") ? this.borderRadius : 0);
        let xEnd = xStart + this.borderRadius + ((orientation == "vs" || orientation == "ve") ? this.borderRadius : 0);
        for (let y = yStart; y < yEnd; y++) {
            let yOffset = y * this.xSize;
            for (let x = xStart; x < xEnd; x++) {
                let xRel = x - xStart - this.borderRadius + (orientation == "he" ? this.borderRadius : 0);
                let yRel = y - yStart - this.borderRadius + (orientation == "ve" ? this.borderRadius : 0);
                if (Math.pow(xRel, 2)
                    + Math.pow(yRel, 2)
                    < Math.pow(this.borderRadius + 1, 2)) {
                    this.pixelArray[yOffset + x] = Util.toU32(cm.getColorRGB(Colors.CURRENT));
                }
            }
        }
    }
    drawHLine(gx, gy) {
        let x = gx * this.blockSize;
        let y = gy * this.blockSize;
        if (pg.roundEdges) {
            this.drawCirc(x, y, "hs");
            this.drawCirc(x + this.blockSize + this.borderRadius, y, "he");
            this.drawRect(x + this.borderRadius, y, this.blockSize, this.borderSize);
        }
        else {
            this.drawRect(x, y, this.blockSize + this.borderSize, this.borderSize);
        }
    }
    drawVLine(gx, gy) {
        let x = gx * this.blockSize;
        let y = gy * this.blockSize;
        if (pg.roundEdges) {
            this.drawCirc(x, y, "vs");
            this.drawCirc(x, y + this.blockSize + this.borderRadius, "ve");
            this.drawRect(x, y + this.borderRadius, this.borderSize, this.blockSize);
        }
        else {
            this.drawRect(x, y, this.borderSize, this.blockSize + this.borderSize);
        }
    }
    fillBlock(gx, gy) {
        let x = gx * this.blockSize;
        let y = gy * this.blockSize;
        this.drawRect(x, y, this.blockSize, this.blockSize);
    }
    drawFrame() {
        cm.setColor(Colors.BORDER);
        this.drawRect(0, 0, this.borderSize, this.ySize);
        this.drawRect(0, 0, this.xSize, this.borderSize);
        this.drawRect(this.xSize - this.borderSize, 0, this.borderSize, this.ySize);
        this.drawRect(0, this.ySize - this.borderSize, this.xSize, this.borderSize);
    }
    draw(colored, frame) {
        this.initPixelArray(colored);
        if (colored) {
            for (let x = 0; x < pg.xMax; x++) {
                for (let y = 0; y < pg.yMax; y++) {
                    cm.setColor(cm.getColor(x, y));
                    this.fillBlock(x, y);
                    if (y == pg.yMax - 1)
                        this.drawHLine(x, y + 1);
                    if (x == pg.xMax - 1)
                        this.drawVLine(x + 1, y);
                }
            }
        }
        cm.setColor(Colors.BORDER);
        for (let y = 0; y < pg.yMax; y++) {
            for (let x = 0; x < pg.xMax; x++) {
                if (pg.blocks[y][x].top)
                    this.drawHLine(x, y);
                if (pg.blocks[y][x].left)
                    this.drawVLine(x, y);
                if (y == pg.yMax - 1 && pg.blocks[y][x].bottom)
                    this.drawHLine(x, y + 1);
                if (x == pg.xMax - 1 && pg.blocks[y][x].right)
                    this.drawVLine(x + 1, y);
            }
        }
        if (frame)
            this.drawFrame();
        this.redraw();
    }
}
class PatternGenerator {
    // private currentIndex  : number;
    // private previousBlocks: SaveFile[];
    constructor() {
        this.pattern = "";
        this.probability = 0;
        this.xMax = 0;
        this.yMax = 0;
        this.colored = false;
        this.frame = false;
        this.roundEdges = false;
        this.running = false;
        this.xStore = [];
        this.yStore = [];
        this.blocks = [];
        // this.currentIndex   = 0;
        // this.previousBlocks = [];
    }
    xFunc(i) {
        let ret = false;
        switch (this.pattern) {
            case "store":
                ret = this.xStore[i];
                break;
            case "random":
                ret = Math.round(Math.random() * 100) < this.probability;
                break;
            case "mirror":
                if (i < Math.ceil(this.xMax / 2)) {
                    this.xStore[i] = Math.round(Math.random() * 100) < this.probability;
                    ret = this.xStore[i];
                }
                else {
                    let idx = (this.xMax - i < 0) ? 0 : this.xMax - i;
                    ret = this.xStore[idx];
                }
                break;
            case "symmetric":
                ret = this.yStore[i];
                break;
            case "diamond":
                if (i <= Math.floor(this.xMax / 2)) {
                    this.xStore[i] = i % 2 == 1;
                    ret = this.xStore[i];
                }
                else {
                    let idx = (this.xMax - i < 0) ? 0 : this.xMax - i;
                    ret = this.xStore[idx];
                }
                break;
            case "h_lines":
                ret = i % 2 == 0;
                break;
            case "diag_lines":
                ret = i % 2 == 0;
                break;
            case "hashtags":
                ret = hashtagPattern[i % hashtagPattern.length];
                break;
            case "cross":
                ret = crossPattern[i % crossPattern.length];
                break;
        }
        this.xStore[i] = ret;
        return ret;
    }
    yFunc(i) {
        let ret = false;
        switch (this.pattern) {
            case "store":
                ret = this.yStore[i];
                break;
            case "random":
                ret = Math.round(Math.random() * 100) < this.probability;
                break;
            case "mirror":
                if (i < Math.ceil(this.yMax / 2)) {
                    this.yStore[i] = Math.round(Math.random() * 100) < this.probability;
                    ret = this.yStore[i];
                }
                else {
                    let idx = (this.yMax - i < 0) ? 0 : this.yMax - i;
                    ret = this.yStore[idx];
                }
                break;
            case "symmetric":
                if (i < Math.ceil(this.yMax / 2)) {
                    this.yStore[i] = Math.round(Math.random() * 100) < this.probability;
                    ret = this.yStore[i];
                }
                else {
                    ret = this.yStore[this.yMax - i];
                    this.yStore[i] = ret;
                }
                break;
            case "diamond":
                if (i <= Math.floor(this.yMax / 2)) {
                    this.yStore[i] = i % 2 == 1;
                    ret = this.yStore[i];
                }
                else {
                    let idx = (this.yMax - i < 0) ? 0 : this.yMax - i;
                    ret = this.yStore[idx];
                }
                break;
            case "h_lines":
                ret = false;
                break;
            case "diag_lines":
                ret = i % 2 == 0;
                break;
            case "hashtags":
                ret = hashtagPattern[i % hashtagPattern.length];
                break;
            case "cross":
                ret = crossPattern[i % crossPattern.length];
                break;
        }
        this.yStore[i] = ret;
        return ret;
    }
    exploreBlock(x, y) {
        if (x < 0 || y < 0 || this.blocks[y][x].explored)
            return;
        else
            this.blocks[y][x].explored = true;
        this.blocks[y][x].color = cm.getCurrentColor();
        for (let oy = -1; oy < 2; oy++) {
            for (let ox = -1; ox < 2; ox++) {
                if (Math.abs(ox) == Math.abs(oy))
                    continue;
                let cx = x + ox;
                let cy = y + oy;
                let isBorder = false;
                if (ox < 0)
                    isBorder = this.blocks[y][x].left;
                else if (ox > 0)
                    isBorder = this.blocks[y][x].right;
                else if (oy < 0)
                    isBorder = this.blocks[y][x].top;
                else if (oy > 0)
                    isBorder = this.blocks[y][x].bottom;
                if (!isBorder) {
                    if (cx >= this.xMax || cy >= this.yMax)
                        continue;
                    this.exploreBlock(cx, cy);
                }
            }
        }
        return;
    }
    generateBlocks() {
        this.initBlocks();
        for (let y = 0; y <= this.yMax; y++) {
            let parity = this.yFunc(y) ? 1 : 0;
            for (let x = 0; x < this.xMax; x++) {
                if (x % 2 == parity) {
                    if (y < this.yMax)
                        this.blocks[y][x].top = true;
                    if (y != 0)
                        this.blocks[y - 1][x].bottom = true;
                }
            }
        }
        for (let x = 0; x <= this.xMax; x++) {
            let parity = this.xFunc(x) ? 1 : 0;
            for (let y = 0; y < this.yMax; y++) {
                if (y % 2 == parity) {
                    if (x < this.xMax)
                        this.blocks[y][x].left = true;
                    if (x != 0)
                        this.blocks[y][x - 1].right = true;
                }
            }
        }
        cm.setColor(Colors.COLOR1);
        for (let x = 0; x < this.xMax; x++) {
            for (let y = 0; y < this.yMax; y++) {
                if (this.blocks[y][x].explored)
                    continue;
                exitLoop: for (let oy = -1; oy < 2; oy++) {
                    for (let ox = -1; ox < 2; ox++) {
                        if (Math.abs(ox) == Math.abs(oy))
                            continue;
                        let cx = x + ox;
                        let cy = y + oy;
                        if (cx < 0 || cy < 0 || cx == this.xMax || cy == this.yMax)
                            continue;
                        if (this.blocks[cy][cx].color == Colors.COLOR1) {
                            cm.setColor(Colors.COLOR2);
                            break exitLoop;
                        }
                        else if (this.blocks[cy][cx].color == Colors.COLOR2) {
                            cm.setColor(Colors.COLOR1);
                            break exitLoop;
                        }
                    }
                }
                this.exploreBlock(x, y);
            }
        }
    }
    draw() {
        cd.draw(this.colored, this.frame);
        this.running = false;
    }
    drawNew() {
        if (this.running)
            return;
        this.running = true;
        // if (this.xStore.length != 0) {
        // 	this.previousBlocks.push(this.saveFile());
        // 	this.currentIndex = this.previousBlocks.length;
        // }
        this.update(false);
        this.generateBlocks();
        this.draw();
    }
    drawAgain(elem, id) {
        if (this.running)
            return;
        this.running = true;
        if (elem !== undefined && id !== undefined)
            cm.chooseColor(elem, id);
        this.update(true);
        this.pattern = "store";
        this.draw();
    }
    // loadConfig(offset: number) {
    // 	let idx = this.currentIndex + offset;
    // 	if (idx < 0 || idx > this.previousBlocks.length) return;
    // 	this.currentIndex = idx;
    // 	this.loadFile(this.previousBlocks[this.currentIndex]);
    // 	this.pattern = "store";
    // 	this.generateBlocks();
    // 	this.draw();
    // }
    update(redraw) {
        this.colored = Util.getInput("colored").checked;
        this.roundEdges = Util.getInput("roundEdges").checked;
        this.frame = Util.getInput("frame").checked;
        this.pattern = Util.getInput("pattern").value;
        this.probability = Util.getInput("probability").valueAsNumber;
        let xSize = Util.getInput("xSize").valueAsNumber;
        let ySize = Util.getInput("ySize").valueAsNumber;
        let fillingSize = Util.getInput("fillingSize").valueAsNumber;
        let borderSize = Util.getInput("borderSize").valueAsNumber;
        cd.setSizes(fillingSize, borderSize);
        if (!redraw) {
            this.xMax = Math.floor((xSize - cd.getBorderSize()) / (cd.getFillingSize() + cd.getBorderSize()));
            this.yMax = Math.floor((ySize - cd.getBorderSize()) / (cd.getFillingSize() + cd.getBorderSize()));
            if (this.xMax % 2 == 0)
                this.xMax--;
            if (this.yMax % 2 == 0)
                this.yMax--;
        }
        cd.setCanvasSize(this.xMax, this.yMax);
    }
    initBlocks() {
        this.blocks = [];
        for (let y = 0; y < this.yMax; y++) {
            let tmp = [];
            for (let x = 0; x < this.xMax; x++) {
                tmp.push({ top: false, right: false, bottom: false, left: false, explored: false, color: Colors.CURRENT });
            }
            this.blocks.push(tmp);
        }
    }
    saveFile() {
        return {
            probability: this.probability,
            xMax: this.xMax,
            yMax: this.yMax,
            fillingSize: cd.getFillingSize(),
            borderSize: cd.getBorderSize(),
            background: cm.getColorRGB(Colors.BACKGROUND),
            border: cm.getColorRGB(Colors.BORDER),
            color1: cm.getColorRGB(Colors.COLOR1),
            color2: cm.getColorRGB(Colors.COLOR2),
            colored: this.colored,
            frame: this.frame,
            roundEdges: this.roundEdges,
            xStore: [...this.xStore],
            yStore: [...this.yStore]
        };
    }
    loadFile(file) {
        this.probability = file.probability;
        this.xMax = file.xMax;
        this.yMax = file.yMax;
        this.colored = file.colored;
        this.frame = file.frame;
        this.roundEdges = file.roundEdges;
        this.xStore = [...file.xStore];
        this.yStore = [...file.yStore];
        cd.setSizes(file.fillingSize, file.borderSize);
        cd.setCanvasSize(file.xMax, file.yMax);
        cm.setColorsRGB(file.background, file.border, file.color1, file.color2);
        let xSize = file.xMax * (file.fillingSize + file.borderSize) + file.borderSize;
        let ySize = file.yMax * (file.fillingSize + file.borderSize) + file.borderSize;
        Util.getInput("xSize").valueAsNumber = xSize;
        Util.getInput("ySize").valueAsNumber = ySize;
        Util.getInput("fillingSize").valueAsNumber = file.fillingSize;
        Util.getInput("borderSize").valueAsNumber = file.borderSize;
        Util.getInput("probability").valueAsNumber = file.probability;
        Util.getInput("colored").checked = file.colored;
        Util.getInput("frame").checked = file.frame;
        Util.getInput("roundEdges").checked = file.roundEdges;
    }
    exportSaveFile() {
        var currentDate = new Date();
        var date = +currentDate.getFullYear() + "_"
            + (currentDate.getMonth() + 1) + "_"
            + currentDate.getDate() + "___"
            + currentDate.getHours() + "_"
            + currentDate.getMinutes() + "_"
            + currentDate.getSeconds();
        let data = "data:text/json;charset=utf-8," + JSON.stringify(this.saveFile());
        let downloadLink = document.createElement("a");
        downloadLink.setAttribute("download", "hitomezashi_" + date + ".hito");
        downloadLink.setAttribute("href", data);
        downloadLink.click();
    }
    async importSaveFile() {
        let parsedJSON;
        try {
            let [fileHandle] = await window.showOpenFilePicker({ multiple: false });
            let file = await fileHandle.getFile();
            let content = await file.text();
            parsedJSON = JSON.parse(content);
        }
        catch (error) {
            return;
        }
        this.loadFile(parsedJSON);
        this.pattern = "store";
        this.generateBlocks();
        this.draw();
    }
}
function changeFilling(state) {
    if (pg.running)
        return;
    pg.colored = state;
    if (state) {
        pg.roundEdges = false;
        Util.getInput("roundEdges").checked = false;
    }
    pg.drawAgain();
}
function changeEdges(state) {
    if (pg.running)
        return;
    pg.roundEdges = state;
    if (state) {
        pg.colored = false;
        Util.getInput("colored").checked = false;
    }
    pg.drawAgain();
}
function changeFrame(state) {
    if (pg.running)
        return;
    pg.frame = state;
    pg.drawAgain();
}
function init() {
    let xPixel = document.body.offsetWidth - 10;
    let yPixel = document.body.offsetHeight - 100;
    let size = (xPixel > yPixel) ? yPixel : xPixel;
    Util.getInput("xSize").valueAsNumber = size;
    Util.getInput("ySize").valueAsNumber = size;
    pg = new PatternGenerator();
    cd = new CanvasDrawer(document.getElementById("canvas"));
    cm = new ColorManager();
    pg.drawNew();
}
init();
