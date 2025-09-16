export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export interface JsonArray extends Array<JsonValue> { }


export interface AnswerItem {
    variablePath: string;
    value: any;
}


export interface TemplateEngineOptions {
    companyName?: string;
}