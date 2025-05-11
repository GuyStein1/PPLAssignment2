import fs from "fs";
import { expect } from 'chai';
import {  evalL32program, evalParse } from '../src/L32/L32-eval';
import { Value } from "../src/L32/L32-value";
import { Result, bind, isFailure, isOk, makeFailure, makeOk } from "../src/shared/result";
import { parseL32, parseL32Exp } from "../src/L32/L32-ast";
import { makeEmptySExp } from "../src/L3/L3-value";

const evalP = (x: string): Result<Value> =>
    bind(parseL32(x), evalL32program);

describe('Q22 Tests', () => {

    it("Q22 basic tests 1", () => {
        expect(evalP(`(L32 ((dict (a 1) (b 2)) 'a))`)).to.deep.equal(makeOk(1));
    });
    
    it("Q22 tests 2", () => {
        expect(evalP(`(L32
                      (define x "a")
                      (define y "b")
                      ((dict (a x) (b y)) 'b))`)).to.deep.equal(makeOk("b"))
    });

    it("Q22 test 3", () => {
        expect(evalP(`(L32 
            (define x 1)
            (
              (if (< x 0)
                (dict (a 1) (b 2))
                (dict (a 2) (b 1)))
            'a))`)).to.deep.equal(makeOk(2));
    });

    // Q22 - Special Form Dict Tests

    it("Q22 Test 4: simple dict creation succeeds", () => {
        expect(isOk(evalP(`(L32 (dict (a 1) (b 2)))`))).to.be.true;
    });

    it("Q22 Test 5: duplicate keys in dict should fail", () => {
        expect(isFailure(evalP(`(L32 (dict (a 1) (a 2)))`))).to.be.true;
    });

    it("Q22 Test 6: lookup existing key succeeds", () => {
        expect(evalP(`(L32 
            (define d (dict (x 10) (y 20)))
            (d 'x)
        )`)).to.deep.equal(makeOk(10));
    });

    it("Q22 Test 7: lookup missing key fails", () => {
        expect(isFailure(evalP(`(L32 
            (define d (dict (x 10) (y 20)))
            (d 'z)
        )`))).to.be.true;
    });

    it("Q22 Test 8: dict with complex values succeeds", () => {
        expect(isOk(evalP(`(L32 (dict (a (+ 1 2)) (b (* 2 3))))`))).to.be.true;
    });

    it("Q22 Test 9: lookup complex computed value", () => {
        expect(evalP(`(L32 
            (define d (dict (a (+ 2 3)) (b (* 4 5))))
            (d 'b)
        )`)).to.deep.equal(makeOk(20));
    });

    it("Q22 Test 10: dict with one key succeeds", () => {
        expect(isOk(evalP(`(L32 (dict (only 42)))`))).to.be.true;
    });

    it("Q22 Test 11: dict with no keys (empty) should succeed", () => {
        expect(isOk(evalP(`(L32 (dict))`))).to.be.true;
    });

    it("Q22 Test 12: lookup from empty dict should fail", () => {
        expect(isFailure(evalP(`(L32 
            (define d (dict))
            (d 'anything)
        )`))).to.be.true;
    });

    it("Q22 Test 13: using undefined variable as value should fail", () => {
        expect(isFailure(evalP(`(L32 (dict (a notDefinedVar)))`))).to.be.true;
    });

    it("Q22 Test 14: define variable before using in dict value succeeds", () => {
        expect(evalP(`(L32 
            (define n 5)
            (define d (dict (a n)))
            (d 'a)
        )`)).to.deep.equal(makeOk(5));
    });

    it("Q22 Test 15: dict with invalid structure (missing value) should fail", () => {
        expect(isFailure(evalP(`(L32 (dict (a)))`))).to.be.true;
    });

    it("Q22 Test 16: dict with number as key should fail", () => {
        expect(isFailure(evalP(`(L32 (dict (1 2) (3 4)))`))).to.be.true;
    });

    it("Q22 Test 17: dict with string as key should fail", () => {
        expect(isFailure(evalP(`(L32 (dict ("x" 1) ("y" 2)))`))).to.be.true;
    });

    it("Q22 Test 18: lookup after redefining variable used in value", () => {
        expect(evalP(`(L32 
            (define val 100)
            (define d (dict (a val)))
            (define val 999)
            (d 'a)
        )`)).to.deep.equal(makeOk(100)); // uses original 100
    });

    it("Q22 Test 19: dict inside dict (nested) succeeds", () => {
        expect(isOk(evalP(`(L32 
            (define d (dict (inner (dict (a 1) (b 2)))))
            (d 'inner)
        )`))).to.be.true;
    });

    it("Q22 Test 20: lookup inside nested dict", () => {
        expect(evalP(`(L32 
            (define inner (dict (x 5)))
            (define outer (dict (a inner)))
            ((outer 'a) 'x)
        )`)).to.deep.equal(makeOk(5));
    });

    it("Q22 Test 21: multiple defines and lookups succeed", () => {
        expect(evalP(`(L32 
            (define d (dict (a 1) (b 2) (c 3)))
            (+ (d 'a) (d 'b) (d 'c))
        )`)).to.deep.equal(makeOk(6));
    });

    it("Q22 Test 22: trying to call non-dict value like function should fail", () => {
        expect(isFailure(evalP(`(L32 
            (define n 5)
            (n 'a)
        )`))).to.be.true;
    });

    it("Q22 Test 23: dict with boolean values", () => {
        expect(isOk(evalP(`(L32 (dict (yes #t) (no #f)))`))).to.be.true;
    });

    it("Q22 Test 24: duplicate keys should result in error", () => {
        expect(isFailure(evalP(`(L32 (dict (a 1) (a 2)))`))).to.be.true;
    });
    
    it("Q22 Test 25: key with missing value should result in parse error", () => {
        expect(isFailure(evalP(`(L32 (dict (a)))`))).to.be.true;
    });
    
    it("Q22 Test 26: key as non-symbol (number) should fail in parser", () => {
        expect(isFailure(evalP(`(L32 (dict (5 "five")))`))).to.be.true;
    });
    
    it("Q22 Test 27: applying dict to non-symbol should error", () => {
        expect(isFailure(evalP(`(L32 
            (define d (dict (a 1))) 
            (d 5)
        )`))).to.be.true;
    });
    
    it("Q22 Test 28: nested dictionaries access", () => {
        expect(evalP(`(L32 
            (define inner (dict (x 10))) 
            (define outer (dict (a inner))) 
            ((outer 'a) 'x)
        )`)).to.deep.equal(makeOk(10));
    });
    
    it("Q22 Test 29: empty dict should return dict with no keys", () => {
        const result = evalP(`(L32 (dict))`);
        expect(isOk(result)).to.be.true;
        expect(result).to.deep.equal(evalParse(`(dict)`)); // תלוי איך dict ריק מתפרש אצלך
    });
    
    it("Q22 Test 30: accessing key from empty dict should fail", () => {
        const result = evalP(`(L32 (define d (dict)) (d 'x))`);
        expect(isFailure(result)).to.be.true;
    });
    


});