
import fs from "fs";
import { expect } from 'chai';
import {  evalL32program } from '../src/L32/L32-eval';
import { Value } from "../src/L32/L32-value";
import { Result, bind, isFailure, makeFailure, makeOk, mapResult } from "../src/shared/result";
import { parseL32, parseL32Exp, unparseL32 } from "../src/L32/L32-ast";
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

    it("Q22 basic tests 2 - duplicate key should fail", () => {
        expect(evalP(`(L32 ((dict (a 1) (a 2)) 'a))`)).is.satisfy(isFailure);
    });


        // Additional tests for nested dictionaries and other edge cases
        it("Q22 Extra test 4: Nested dictionaries", () => {
            expect(evalP(`(L32 
                (define d (dict (a (dict (x 10) (y 20))) (b 2)))
                ((d 'a) 'x))`)).to.deep.equal(makeOk(10));
        });
    
        it("Q22 Extra test 5: Dictionary with expressions as values", () => {
            expect(evalP(`(L32 
                (define d (dict (a (+ 1 2)) (b (* 3 4))))
                (d 'a))`)).to.deep.equal(makeOk(3));
        });
    
        it("Q22 Extra test 6: Invalid dictionary entry (non-string key)", () => {
            expect(evalP(`(L32 
                (dict (1 2) (b 3)))`)).to.satisfy(isFailure);
        });
    0
        it("Q22 Extra test 7: Dictionary application with invalid key type", () => {
            expect(evalP(`(L32 
                (define d (dict (a 1) (b 2)))
                (d 123))`)).to.satisfy(isFailure);
        });
    
        it("Q22 Extra test 8: Empty dictionary", () => {
            expect(evalP(`(L32 
                (define d (dict))
                (d 'a))`)).to.satisfy(isFailure);
        });
    
        it("Q22 Extra test 9: Dictionary with duplicate keys", () => {
            expect(evalP(`(L32 
                (dict (a 1) (a 2)))`)).to.satisfy(isFailure);
        });
    
        it("Q22 Extra test 10: Dictionary with conditional keys", () => {
            expect(evalP(`(L32 
                (define x #t)
                (
                (if x
                    (dict (a 42))
                    (dict (b 42))
                )
                'a))`)).to.deep.equal(makeOk(42));
        });
    
        it("Q22 Extra test 11: Literal dictionary values", () => {
            expect(evalP(`(L32 
                (define d (dict (a "hello") (b #t)))
                (d 'a))`)).to.deep.equal(makeOk("hello"));
            expect(evalP(`(L32 
                (define d (dict (a "hello") (b #t)))
                (d 'b))`)).to.deep.equal(makeOk(true));
        });

    // Test 4: Accessing a missing key should fail
    it("Q22 test 4 - missing key should fail", () => {
        expect(evalP(`(L32 ((dict (a 1) (b 2)) 'c))`)).to.satisfy(isFailure);
    });

    // Test 5: Duplicate keys in dict should fail
    it("Q22 test 5 - duplicate keys should fail", () => {
        expect(evalP(`(L32 ((dict (a 1) (a 2)) 'a))`)).to.satisfy(isFailure);
    });

    // Test 6: Dict passed into a lambda
    it("Q22 test 6 - dict inside lambda", () => {
        expect(evalP(`(L32 
            ((lambda (d) (d 'b))
             (dict (a 1) (b 5))))`)).to.deep.equal(makeOk(5));
    });

    // Test 7: Dict assigned to variable and accessed
    it("Q22 test 7 - dict assigned to variable", () => {
        expect(evalP(`(L32 
            (define d (dict (a 1) (b 10)))
            (d 'b))`)).to.deep.equal(makeOk(10));
    });

    // Test 8: Nested dict access
    it("Q22 test 8 - nested dict access", () => {
        expect(evalP(`(L32
            (((dict (a (dict (x 42)))) 'a) 'x))`)).to.deep.equal(makeOk(42));
    });

    // Test 9: Dict values using expressions
    it("Q22 test 9 - dict with expression values", () => {
        expect(evalP(`(L32 ((dict (a (+ 1 1)) (b (* 2 2))) 'b))`)).to.deep.equal(makeOk(4));
    });

    // Test 11: Using number as a key should fail
    it("Q22 test 11 - key is not a symbol (should fail)", () => {
        expect(evalP(`(L32 ((dict (55555555 100) (b 2)) 'b))`)).to.satisfy(isFailure);
    });

    // Test 11: Using number as a key should fail
    it("Q22 test 11.1 - key is not a symbol (should fail)", () => {
        expect(evalP(`(L32 ((dict (a15 100) (b 2)) 'a15))`)).to.deep.equal(makeOk(100));
    });

    it("Q22 test 17 - unparse a dict expression", () => {
        const code = `(L32 ((dict (a 1) (b 2))))`;
        const parsed1 = parseL32(code);
        const unparsed = bind(parsed1, (exp) => makeOk(unparseL32(exp)));  // unparse back to string
        const reparsed = bind(unparsed, parseL32);  // parse again to AST
    
        expect(reparsed).to.deep.equal(parsed1);
    });
    

    // Test 12: Accessing from an empty dict should fail
    it("Q22 test 12 - access from empty dict (should fail)", () => {
        expect(evalP(`(L32 ((dict) 'a))`)).to.satisfy(isFailure);
    });

    // Test 12: Accessing from an empty dict should fail
    it("Q22 test 40 - access from empty dict (should fail)", () => {
        expect(evalP(`(L32 (dict (a () b) 'a))`)).to.satisfy(isFailure);
    });

    it("Q22 test - duplicate key due to variable (should fail at eval11)", () => {
        expect(evalP(`(L32 
            (define k 6)
            ((dict (b k) (a 2)) 'b))`)).to.deep.equal(makeOk(6));
    });

    // Test 13: Dict with mixed value types
    it("Q22 test 13 - dict with mixed types", () => {
        expect(evalP(`(L32 ((dict (n 42) (b #t) (s "hi")) 's))`)).to.deep.equal(makeOk("hi"));
    });

    // Test 14: Dict used inside a defined lambda
    it("Q22 test 14 - dict used inside defined lambda", () => {
        expect(evalP(`(L32
            (define pick (lambda (d k) (d k)))
            (pick (dict (x 1) (y 2)) 'y))`)).to.deep.equal(makeOk(2));
    });

    it("Q22 test 13 - dict returned from lambda", () => {
        expect(evalP(`(L32
            ((lambda ()
                ((dict (m 7)) 'm))))`)).to.deep.equal(makeOk(7));
    });

    it("Q22 Extra test 16: Dictionary with conditional keys", () => {
        expect(evalP(`(L32 
            (define flag #t)
            ((if flag
                (dict (z 9))
                (dict (z 0))
            )
            'z))`)).to.deep.equal(makeOk(9));
    });
    
});