import { bgRed, Color, green, red, yellow } from 'colors'

export default class FELog {
    private static line = '########################################################################################################'
    private static __l(text: string, color: Color) {
        console.log(color(text))
    }

    static log(text: string) {
        this.__l(this.line, green);
        this.__l('### ' + text, green);
        this.__l(this.line, green);
    }

    static warn(text: string) {
        this.__l(this.line, yellow);
        this.__l('### ' + text, yellow);
        this.__l(this.line, yellow);
    }

    static error(text: string) {
        this.__l(this.line, red);
        this.__l('### ' + text, bgRed);
        this.__l(this.line, red);
    }
}