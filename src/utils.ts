import { format as formatDate, parseISO } from 'date-fns';


export function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export function deepGet(obj: any, path: string): any {
    if (!path) return undefined;

    // NEW: handle direct properties in current scope (like "children" inside a parent block)
    if (obj && typeof obj === "object" && path in obj) {
        return obj[path];
    }

    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur === undefined || cur === null) return undefined;
        const arrayMatch = p.match(/^(\w+)\[(\d+)\]$/);
        const iterateMatch = p.match(/^(\w+)\[\]$/);
        if (arrayMatch) {
            const key = arrayMatch[1];
            const idx = parseInt(arrayMatch[2], 10);
            if (!Array.isArray(cur[key])) return undefined;
            cur = cur[key][idx];
        } else if (iterateMatch) {
            const key = iterateMatch[1];
            cur = cur[key];
        } else {
            cur = cur[p];
        }
    }
    return cur;
}



export function escapeXml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


export function formatWithRule(raw: any, rule?: string): string {
    if (raw === undefined || raw === null) return '';
    let val = String(raw);
    if (!rule) return escapeXml(val);
    const [r, param] = rule.split(':');
    switch (r) {
        case 'uppercase': return escapeXml(val.toUpperCase());
        case 'lowercase': return escapeXml(val.toLowerCase());
        case 'ucfirst': return escapeXml(val.charAt(0).toUpperCase() + val.slice(1));
        case 'ucwords': return escapeXml(val.replace(/\b\w/g, c => c.toUpperCase()));
        case 'number_format':
            if (!isNaN(Number(val))) return escapeXml(Number(val).toLocaleString());
            return escapeXml(val);
        case 'date':
            try {
                const parsed = parseISO(val);
                return escapeXml(formatDate(parsed, param || 'yyyy-MM-dd'));
            } catch {
                return escapeXml(val);
            }
        default:
            return escapeXml(val);
    }
}


export function parsePlaceholder(expr: string): { path: string, prefixes: string[], rule?: string } {
    const parts = expr.split('|');
    let varPart = parts[0].trim();
    const rule = parts[1]?.trim();

    const prefixes: string[] = [];
    let path = varPart;

    // Extract prefixes from the start
    while (true) {
        let matched = false;
        for (const prefix of ['ls.', 'rs.', 'bs.', ',', 'uc.', 'lc.', 'tc.', 'fc.']) {
            if (path.startsWith(prefix)) {
                if (prefix === ',') {
                    prefixes.push('comma');
                } else {
                    prefixes.push(prefix.slice(0, -1)); // remove the dot
                }
                path = path.substring(prefix.length);
                matched = true;
                break;
            }
        }
        if (!matched) break;
    }

    return { path, prefixes, rule };
}
