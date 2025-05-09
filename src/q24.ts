import {
    Program, Exp, CExp, DictExp, DictEntry,
    isDefineExp, isDictExp,
    isIfExp, isProcExp, isAppExp, isLetExp, isLitExp,
    makeDefineExp, makeProgram, makeAppExp, makeVarRef, makeLitExp,
    makeIfExp, makeProcExp, makeLetExp,
    isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, VarDecl
} from './L32/L32-ast';

import {
    makeCompoundSExp, makeEmptySExp, SExpValue, makeSymbolSExp
} from './L32/L32-value';

import { readFileSync } from 'fs';
import { parseL3 } from './L3/L3-ast';
import { isOk } from './shared/result';

import { map } from "ramda";

import { writeFileSync, appendFileSync } from 'fs';

/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/
export const Dict2App = (prog: Program): Program =>
    makeProgram(map(rewriteAllDictExp, prog.exps));

/*
Purpose: Rewrite a single DictExp into AppExp form
Signature: rewriteDict(e)
Type: DictExp -> AppExp
*/
const rewriteDict = (e: DictExp): CExp => {
    // Build the quoted key-value list
    const keyVals = e.entries.map(({ key, val }) => {
        const kv = makeCompoundSExp(key, quoteCExpToSExp(val));
        return kv;
    });

    // Wrap in a quoted list and create the application expression
    const result = makeAppExp(
        makeVarRef("dict"),
        [makeLitExp(makeCompoundSExpList(keyVals))]
    );

    // Log the final result for debugging
    appendFileSync('debug-log.txt', "\n--- Rewriting DictExp ---\n");
    appendFileSync('debug-log.txt', JSON.stringify(result, null, 2) + "\n");

    e.entries.forEach(({ key, val }) => {
        const kv = makeCompoundSExp(key, quoteCExpToSExp(val));
        appendFileSync('debug-log.txt', "Key-Value Pair:\n" + JSON.stringify(kv, null, 2) + "\n");
    });

    return result;
};


/*
Purpose: Rewrite a top-level DefineExp or CExp
Signature: rewriteAllDictExp(exp)
Type: Exp -> Exp
*/
const rewriteAllDictExp = (exp: Exp): Exp =>
    isDefineExp(exp)
        ? makeDefineExp(exp.var, rewriteAllDictCExp(exp.val))
        : rewriteAllDictCExp(exp);

/*
Purpose: Recursively rewrite DictExp into AppExp in any CExp
Signature: rewriteAllDictCExp(exp)
Type: CExp -> CExp
*/
const rewriteAllDictCExp = (exp: CExp): CExp =>
    isDictExp(exp) ? rewriteDict(exp) :
    isIfExp(exp)   ? makeIfExp(rewriteAllDictCExp(exp.test),
                               rewriteAllDictCExp(exp.then),
                               rewriteAllDictCExp(exp.alt)) :
    isAppExp(exp)  ? makeAppExp(rewriteAllDictCExp(exp.rator),
                                map(rewriteAllDictCExp, exp.rands)) :
    isProcExp(exp) ? makeProcExp(exp.args,
                                 map(rewriteAllDictCExp, exp.body)) :
    isLetExp(exp)  ? makeLetExp(exp.bindings.map(b => ({
                                ...b, val: rewriteAllDictCExp(b.val)
                              })),
                                map(rewriteAllDictCExp, exp.body)) :
    isLitExp(exp)  ? makeLitExp(exp.val) :
    exp;

/*
Purpose: Convert list of DictEntry to nested compound S-expression
Signature: entriesToCompoundSExp(entries)
Type: DictEntry[] -> SExpValue
*/
export const entriesToCompoundSExp = (entries: DictEntry[]): SExpValue =>
    entries.reduceRight<SExpValue>(
        (acc, entry) =>
            makeCompoundSExp(
                makeCompoundSExp(entry.key, quoteCExpToSExp(entry.val)),
                acc
            ),
        makeEmptySExp()
    );

/*
Purpose: Convert a CExp to a quoted SExpValue
Signature: quoteCExpToSExp(e)
Type: CExp -> SExpValue
*/
export const quoteCExpToSExp = (e: CExp): SExpValue =>
    isNumExp(e) ? e.val :
    isBoolExp(e) ? e.val :
    isStrExp(e) ? e.val :
    isLitExp(e) ? e.val :
    isPrimOp(e) ? makeSymbolSExp(e.op) :
    isVarRef(e) ? makeSymbolSExp(e.var) :

    isAppExp(e) ?
        makeCompoundSExpList([
            quoteCExpToSExp(e.rator),
            ...e.rands.map(quoteCExpToSExp)
        ]) :

    isIfExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("if"),
            quoteCExpToSExp(e.test),
            quoteCExpToSExp(e.then),
            quoteCExpToSExp(e.alt)
        ]) :

    isProcExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("lambda"),
            makeCompoundSExpList(e.args.map((arg: VarDecl) => makeSymbolSExp(arg.var))),
            ...e.body.map(quoteCExpToSExp)
        ]) :

    isLetExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("let"),
            makeCompoundSExpList(
                e.bindings.map(b =>
                    makeCompoundSExpList([
                        makeSymbolSExp(b.var.var),
                        quoteCExpToSExp(b.val)
                    ])
                )
            ),
            ...e.body.map(quoteCExpToSExp)
        ]) :

    isDictExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("dict"),
            makeCompoundSExpList(
                e.entries.map((entry: DictEntry) =>
                    makeCompoundSExpList([
                        entry.key,
                        quoteCExpToSExp(entry.val)
                    ])
                )
            )
        ]) :

    // Fallback for safety
    (() => { throw new Error(`Cannot quote non-literal expression`); })();

/*
Purpose: Build a nested compound S-expression list (linked list)
Signature: makeCompoundSExpList(xs)
Type: SExpValue[] -> SExpValue
*/
export const makeCompoundSExpList = (xs: SExpValue[]): SExpValue =>
    xs.reduceRight((acc, x) => makeCompoundSExp(x, acc), makeEmptySExp());
    

/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog: Program): Program => {
    // 1. Apply Dict2App to remove all DictExp occurrences
    const transformed = Dict2App(prog).exps;

    // 2. Read and parse the q23.l3 definitions
    const q23Code = readFileSync("src/q23.l3", "utf-8");
    const parsedPrelude = parseL3(q23Code);

    if (!isOk(parsedPrelude)) {
        throw new Error("Failed to parse q23.l3");
    }

    const fullProgram = makeProgram([...parsedPrelude.value.exps, ...transformed]);

    writeFileSync("debug-log.txt", "=== Final Transformed Program ===\n");
    appendFileSync("debug-log.txt", JSON.stringify(fullProgram, null, 2) + "\n");
    // 3. Combine and return the unified program
    return makeProgram([...parsedPrelude.value.exps, ...transformed]);
};


