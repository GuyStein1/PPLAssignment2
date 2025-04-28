import { reduce } from "ramda";
import { PrimOp } from "./L31-ast";
import { isCompoundSExp, isEmptySExp, isSymbolSExp, makeCompoundSExp, makeEmptySExp, CompoundSExp, EmptySExp, Value } from "./L31-value";
import { List, allT, first, isNonEmptyList, rest } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure, bind } from "../shared/result";
import { format } from "../shared/format";

export const applyPrimitive = (proc: PrimOp, args: Value[]): Result<Value> =>
    proc.op === "+" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x + y, 0, args)) : 
                                              makeFailure(`+ expects numbers only: ${format(args)}`)) :
    proc.op === "-" ? minusPrim(args) :
    proc.op === "*" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x * y, 1, args)) : 
                                              makeFailure(`* expects numbers only: ${format(args)}`)) :
    proc.op === "/" ? divPrim(args) :
    proc.op === ">" ? makeOk(args[0] > args[1]) :
    proc.op === "<" ? makeOk(args[0] < args[1]) :
    proc.op === "=" ? makeOk(args[0] === args[1]) :
    proc.op === "not" ? makeOk(!args[0]) :
    proc.op === "and" ? isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] && args[1]) : 
                                                                   makeFailure(`Arguments to "and" not booleans: ${format(args)}`) :
    proc.op === "or" ? isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] || args[1]) : 
                                                                  makeFailure(`Arguments to "or" not booleans: ${format(args)}`) :
    proc.op === "eq?" ? makeOk(eqPrim(args)) :
    proc.op === "string=?" ? makeOk(args[0] === args[1]) :
    proc.op === "cons" ? makeOk(consPrim(args[0], args[1])) :
    proc.op === "car" ? carPrim(args[0]) :
    proc.op === "cdr" ? cdrPrim(args[0]) :
    proc.op === "list" ? makeOk(listPrim(args)) :
    proc.op === "pair?" ? makeOk(isPairPrim(args[0])) :
    proc.op === "number?" ? makeOk(typeof (args[0]) === 'number') :
    proc.op === "boolean?" ? makeOk(typeof (args[0]) === 'boolean') :
    proc.op === "symbol?" ? makeOk(isSymbolSExp(args[0])) :
    proc.op === "string?" ? makeOk(isString(args[0])) :

    // ADDED: New dictionary primitives
    proc.op === "dict" ? evalDict(args) :
    proc.op === "get" ? evalGet(args) :
    proc.op === "dict?" ? makeOk(isDict(args[0], [])) :

    makeFailure(`Unknown primitive: ${proc.op}`);

// ADDED: Checks if a value is a dictionary structure (a proper list).
const isDict = (current: any, keys: string[] = []): boolean =>
    isEmptySExp(current) ? true :
    !isCompoundSExp(current) ? false :
    !isCompoundSExp(current.val1) || !isSymbolSExp(current.val1.val1) ? false :
    keys.includes(current.val1.val1.val) ? false :
    isDict(current.val2, [...keys, current.val1.val1.val]);

// ADDED: Implementation of (dict <lit-exp>)
const evalDict = (args: Value[]): Result<Value> =>
    args.length !== 1 ? makeFailure("dict expects exactly one argument") :
    !isCompoundSExp(args[0]) ? makeFailure("dict expects a quoted list of pairs") :
    bind(validateDict(args[0], []), _ => makeOk(args[0]));

const validateDict = (quoted: Value, keys: string[]): Result<true> =>
    isEmptySExp(quoted) ? makeOk(true) :
    !isCompoundSExp(quoted) ? makeFailure("dict expects a proper list") :
    !isCompoundSExp(quoted.val1) ? makeFailure("Each element inside dict must be a pair") :
    !isSymbolSExp(quoted.val1.val1) ? makeFailure("Each key must be a symbol") :
    keys.includes(quoted.val1.val1.val) ? makeFailure(`Duplicate key: ${quoted.val1.val1.val}`) :
    validateDict(quoted.val2, [...keys, quoted.val1.val1.val]);


// ADDED: Implementation of (get <dict-exp> <key-exp>)
const evalGet = (args: Value[]): Result<Value> =>
    args.length !== 2 ? makeFailure("get expects exactly two arguments") :
    !isDict(args[0]) ? makeFailure("First argument to get must be a dictionary") :
    !isSymbolSExp(args[1]) ? makeFailure("Second argument to get must be a symbol") :
    isEmptySExp(args[0]) ? makeFailure(`Key '${args[1].val}' not found in dictionary`) :
    !isCompoundSExp(args[0]) ? makeFailure("Malformed dictionary: expected CompoundSExp") :
    !isCompoundSExp(args[0].val1) ? makeFailure("Malformed dictionary entry: expected (key . value) pair") :
    (isSymbolSExp(args[0].val1.val1) && args[0].val1.val1.val === args[1].val) ?
        makeOk(args[0].val1.val2) :
        evalGet([args[0].val2, args[1]]);


const minusPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x - y);
    }
    else {
        return makeFailure(`Type error: - expects numbers ${format(args)}`);
    }
};

const divPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x / y);
    }
    else {
        return makeFailure(`Type error: / expects numbers ${format(args)}`);
    }
};

const eqPrim = (args: Value[]): boolean => {
    const x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    }
    else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    }
    else if (isNumber(x) && isNumber(y)) {
        return x === y;
    }
    else if (isString(x) && isString(y)) {
        return x === y;
    }
    else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    }
    else {
        return false;
    }
};

const carPrim = (v: Value): Result<Value> => 
    isCompoundSExp(v) ? makeOk(v.val1) :
    makeFailure(`Car: param is not compound ${format(v)}`);

const cdrPrim = (v: Value): Result<Value> =>
    isCompoundSExp(v) ? makeOk(v.val2) :
    makeFailure(`Cdr: param is not compound ${format(v)}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: List<Value>): EmptySExp | CompoundSExp =>
    isNonEmptyList<Value>(vals) ? makeCompoundSExp(first(vals), listPrim(rest(vals))) :
    makeEmptySExp();

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);

