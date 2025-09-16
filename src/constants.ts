export const VARIABLE_LEFT = '{{';
export const VARIABLE_RIGHT = '}}';
export const CONDITION_LEFT = '[[';
export const CONDITION_RIGHT = ']]';
export const CONDITION_END_PREFIX = 'end:'; // [[end:...]]
export const ADD_MORE_LEFT = '<<add_more'; // used as <<add_more path>>
export const ADD_MORE_RIGHT = '>>';
export const ADD_MORE_END = '<<end:add_more>>';


// Regex (constructed from constants)
export const RX_VARIABLE = new RegExp('\\{\\{\\s*(.*?)\\s*\\}\\}', 'g');
export const RX_CONDITION_BLOCK = /\[\[(.*?)\]\]([\s\S]*?)\s*\[\[end:\1\]\]/g;
export const RX_ADD_MORE = /<<add_more(.*?)>>([\s\S]*)\s*<<end:add_more>>/gs;
