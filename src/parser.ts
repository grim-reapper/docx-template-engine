import { RX_VARIABLE, RX_CONDITION_BLOCK, RX_ADD_MORE, VARIABLE_LEFT, VARIABLE_RIGHT } from './constants';
import { JsonObject } from './types';
import { deepGet, escapeRegex, escapeXml, formatWithRule, parsePlaceholder } from './utils';


export class TemplateParser {
    constructor(private data: JsonObject, private globalScope: any = {}) { }


    replaceSimplePlaceholder(xml: string, key: string, value: string) {
        const pat = new RegExp(escapeRegex(VARIABLE_LEFT) + '\\s*' + escapeRegex(key) + '\\s*' + escapeRegex(VARIABLE_RIGHT), 'g');
        return xml.replace(pat, escapeXml(value));
    }


    replaceAllVariables(xml: string, localScope: any = {}): string {
        return xml.replace(RX_VARIABLE, (_m, expr) => {
            const { path, prefixes, rule } = parsePlaceholder(expr);
            const val = this.resolvePathForReplacement(path, localScope);
            if (val === undefined || val === null) return '';
            if (Array.isArray(val) || typeof val === 'object') return escapeXml(JSON.stringify(val));
            let formatted = formatWithRule(val, rule);

            // Apply prefixes in reverse order
            for (const prefix of prefixes.reverse()) {
                switch (prefix) {
                    case 'ls':
                        formatted = ' ' + formatted;
                        break;
                    case 'rs':
                        formatted = formatted + ' ';
                        break;
                    case 'bs':
                        formatted = ' ' + formatted + ' ';
                        break;
                    case 'comma':
                        formatted = ',' + formatted;
                        break;
                    case 'uc':
                        formatted = formatted.toUpperCase();
                        break;
                    case 'lc':
                        formatted = formatted.toLowerCase();
                        break;
                    case 'tc':
                        formatted = formatted.replace(/\b\w/g, c => c.toUpperCase());
                        break;
                    case 'fc':
                        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
                        break;
                }
            }

            return formatted;
        });
    }


    private resolvePathForReplacement(path: string, scope: any): any {
        if (path.includes('[]')) {
            const firstPath = path.replace(/\[\]/g, '[0]');
            return deepGet(scope, firstPath);
        }
        return deepGet(scope, path);
    }


    processConditionsRaw(xml: string, localScope: any = {}): string {
        return xml.replace(RX_CONDITION_BLOCK, (_m, condExpr, innerContent) => {
            const cond = condExpr.trim();
            const val = this.evaluateConditionPath(cond, localScope);
            if (!val) return '';
            let processed = innerContent;
            processed = this.processAddMoreRaw(processed, localScope);
            processed = this.processConditionsRaw(processed, localScope);
            processed = this.replaceAllVariables(processed, localScope);
            return processed;
        });
    }


    private evaluateConditionPath(cond: string, scope: any): boolean {
        // Handle AND/OR logic
        if (cond.includes(' and ')) {
            const parts = cond.split(' and ');
            return parts.every(part => this.evaluateSingleCondition(part.trim(), scope));
        } else if (cond.includes(' or ')) {
            const parts = cond.split(' or ');
            return parts.some(part => this.evaluateSingleCondition(part.trim(), scope));
        } else {
            return this.evaluateSingleCondition(cond, scope);
        }
    }

    private evaluateSingleCondition(cond: string, scope: any): boolean {
        // Special conditions for add_more blocks
        if (cond === 'count1') {
            return scope._length === 1;
        } else if (cond === 'count2') {
            return true;
        } else if (cond === 'common') {
            return scope._index === 0;
        }

        // Handle negation with .no suffix (only if the .no property doesn't exist)
        if (cond.endsWith('.no')) {
            // First check if the full path exists (e.g., agent.no exists)
            if (scope && (cond in scope)) {
                return Boolean(scope[cond]);
            }
            const v = deepGet(scope as any, cond);
            if (v !== undefined) {
                return Boolean(v);
            }

            // If the full path doesn't exist, treat as negation
            const actualCond = cond.slice(0, -3); // Remove .no
            if (scope && (actualCond in scope)) return !Boolean(scope[actualCond]);
            const v2 = deepGet(scope as any, actualCond);
            return !Boolean(v2);
        }

        // Handle comparison operations
        if (cond.includes(' > ')) {
            const parts = cond.split(' > ');
            const left = this.evaluateExpression(parts[0].trim(), scope);
            const right = this.evaluateExpression(parts[1].trim(), scope);
            return Number(left) > Number(right);
        }

        if (scope && (cond in scope)) {
            return Boolean(scope[cond]);
        }

        const v = deepGet(scope as any, cond);
        return !!v;
    }

    private evaluateExpression(expr: string, scope: any): any {
        // Handle property access
        if (scope && (expr in scope)) return scope[expr];
        return deepGet(scope as any, expr);
    }


    processAddMoreRaw(xml: string, localScope: any = {}): string {
        return xml.replace(RX_ADD_MORE, (_m, pathExpr, innerContent) => {
            const cleaned = pathExpr.trim().replace(/^[=>\s\"]+|[\"]+$/g, '').trim();
            const arr = deepGet(localScope as any, cleaned);
            if (!Array.isArray(arr)) return '';


            let result = '';
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const childScope = { ...localScope };
                if (typeof item === 'object' && item !== null) {
                    Object.assign(childScope, item);
                } else {
                    childScope['value'] = item;
                }
                childScope['_index'] = i;
                childScope['_length'] = arr.length;


                let inner = innerContent;
                inner = this.processAddMoreRaw(inner, childScope);
                inner = this.processConditionsRaw(inner, childScope);
                inner = this.replaceAllVariables(inner, childScope);


                result += inner;
            }
            return result;
        });
    }
}
