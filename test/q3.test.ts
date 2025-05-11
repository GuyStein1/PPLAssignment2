
import { expect } from 'chai';
import { parseL3, parseL3Exp } from '../src/L3/L3-ast';
import { bind, Result, makeOk, mapResult } from '../src/shared/result';
import { l2ToJS } from '../src/q3';
import { parse as p } from "../src/shared/parser";

const l2toJSResult = (x: string): Result<string> =>
    bind(bind(p(x), parseL3Exp), l2ToJS);

describe('Q3 Tests', () => {
    it('parses primitive ops', () => {
        expect(l2toJSResult(`(+ 3 5 7)`)).to.deep.equal(makeOk(`(3 + 5 + 7)`));
        expect(l2toJSResult(`(= 3 (+ 1 2))`)).to.deep.equal(makeOk(`(3 === (1 + 2))`));
    });

    it('parses "if" expressions', () => {
        expect(l2toJSResult(`(if (> x 3) 4 5)`)).to.deep.equal(makeOk(`((x > 3) ? 4 : 5)`));
    });

    it('parses "lambda" expressions', () => {
        expect(l2toJSResult(`(lambda (x y) (* x y))`)).to.deep.equal(makeOk(`((x,y) => (x * y))`));
        expect(l2toJSResult(`((lambda (x y) (* x y)) 3 4)`)).to.deep.equal(makeOk(`((x,y) => (x * y))(3,4)`));
    });

    it('parses "lambda" expressions 2', () => {
        expect(l2toJSResult(`(lambda (x) (eq? x 5))`)).to.deep.equal(makeOk(`((x) => (x === 5))`));
    });

    it('parses "lambda" expressions 3', () => {
        expect(l2toJSResult(`(lambda () 5 )`)).to.deep.equal(makeOk(`(() => 5)`));
    });
    
    it("defines constants", () => {
        expect(l2toJSResult(`(define pi 3.14)`)).to.deep.equal(makeOk(`const pi = 3.14`));
        expect(l2toJSResult(`(define e 2.71)`)).to.deep.equal(makeOk(`const e = 2.71`));
    });

    it("defines functions", () => {
        expect(l2toJSResult(`(define f (lambda (x y) (* x y)))`)).to.deep.equal(makeOk(`const f = ((x,y) => (x * y))`));
    });

    it("defines functions 2", () => {
        expect(l2toJSResult(`(define g (lambda () (+ 1 2)))`)).to.deep.equal(makeOk(`const g = (() => (1 + 2))`));
    });

    const adir = (x:number, y:number) => (x < y) ? x : y;
    it("defines functions 3", () => {
        expect(l2toJSResult(`(define h (lambda (x y) (if (< x y) x y)))`)).to.deep.equal(makeOk(`const h = ((x,y) => ((x < y) ? x : y))`));
    });

    it("applies user-defined functions", () => {
        expect(l2toJSResult(`(f 3 4)`)).to.deep.equal(makeOk(`f(3,4)`));
    });

    it("applies user-defined functions 2", () => {
        expect(l2toJSResult(`(g )`)).to.deep.equal(makeOk(`g()`))
    });


    it('parses programs', () => {
        expect(bind(parseL3(`
            (L3 
              (define b (> 3 4)) 
              (define x 5) 
              (define f (lambda (y) (+ x y))) 
              (define g (lambda (y) (* x y))) 
              (if (not b) (f 3) (g 4)) 
              ((lambda (x) (* x x)) 7))
              `), l2ToJS)).to.deep.equal(makeOk(`const b = (3 > 4);\nconst x = 5;\nconst f = ((y) => (x + y));\nconst g = ((y) => (x * y));\n((!b) ? f(3) : g(4));\n((x) => (x * x))(7)`));
    });

    describe("Q3 Complex If and Primitive Tests", () => {
        it("Q3 test 1", () => {
            expect(l2toJSResult(`(if (< 1 2) 3 4)`)).to.deep.equal(makeOk(`((1 < 2) ? 3 : 4)`));
        });
        it("Q3 test 2", () => {
            expect(l2toJSResult(`(if (> 5 3) (+ 1 2) (- 5 2))`)).to.deep.equal(makeOk(`((5 > 3) ? (1 + 2) : (5 - 2))`));
        });
        // it("Q3 test 3", () => {
        //     expect(l2toJSResult(`(if (= (* 2 2) 4) 'yes 'no)`)).to.deep.equal(makeOk(`(((2 * 2) === 4) ? 'yes' : 'no')`));
        // });
        // it("Q3 test 4", () => {
        //     expect(l2toJSResult(`(if (eq? 'a 'a) #t #f)`)).to.deep.equal(makeOk(`(('a' === 'a') ? true : false)`));
        // });
        it("Q3 test 5", () => {
            expect(l2toJSResult(`(if (boolean? #t) 1 0)`)).to.deep.equal(makeOk(`((typeof(true) === 'boolean') ? 1 : 0)`));
        });
        it("Q3 test 6", () => {
            expect(l2toJSResult(`(if (number? 10) 'num 'not-num)`)).to.deep.equal(makeOk(`((typeof(10) === 'number') ? 'num' : 'not-num')`));
        });
        it("Q3 test 7", () => {
            expect(l2toJSResult(`(if (and #t #f) 1 0)`)).to.deep.equal(makeOk(`((true && false) ? 1 : 0)`));
        });
        it("Q3 test 8", () => {
            expect(l2toJSResult(`(if (or #f #t) 1 0)`)).to.deep.equal(makeOk(`((false || true) ? 1 : 0)`));
        });
        it("Q3 test 9", () => {
            expect(l2toJSResult(`(if (not #f) 1 0)`)).to.deep.equal(makeOk(`((!false) ? 1 : 0)`));
        });
        it("Q3 test 10", () => {
            expect(l2toJSResult(`(if (eq? 3 4) 0 1)`)).to.deep.equal(makeOk(`((3 === 4) ? 0 : 1)`));
        });
        it("Q3 test 11", () => {
            expect(l2toJSResult(`(define x 5)`)).to.deep.equal(makeOk(`const x = 5`));
        });
        it("Q3 test 12", () => {
            expect(l2toJSResult(`(if (< x 10) (* x 2) (/ x 2))`)).to.deep.equal(makeOk(`((x < 10) ? (x * 2) : (x / 2))`));
        });
        it("Q3 test 13", () => {
            expect(l2toJSResult(`(define isEven (lambda (x) (= (/ x 2) 0)))`)).to.deep.equal(makeOk(`const isEven = ((x) => ((x / 2) === 0))`));
        });
        it("Q3 test 14", () => {
            expect(l2toJSResult(`(isEven 4)`)).to.deep.equal(makeOk(`isEven(4)`));
        });
        it("Q3 test 15", () => {
            expect(l2toJSResult(`((lambda (x) (if (> x 0) x (- x))) -3)`)).to.deep.equal(makeOk(`((x) => ((x > 0) ? x : (0 - x)))(-3)`));
        });
        it("Q3 test 16", () => {
            expect(l2toJSResult(`(define abs (lambda (x) (if (< x 0) (- 0 x) x)))`)).to.deep.equal(makeOk(`const abs = ((x) => ((x < 0) ? (0 - x) : x))`));
        });
        it("Q3 test 17", () => {
            expect(l2toJSResult(`(abs -10)`)).to.deep.equal(makeOk(`abs(-10)`));
        });
        it("Q3 test 18", () => {
            expect(l2toJSResult(`((lambda (x) (if (number? x) (+ x 1) 0)) 7)`)).to.deep.equal(makeOk(`((x) => ((typeof(x) === 'number') ? (x + 1) : 0))(7)`));
        });
        it("Q3 test 19", () => {
            expect(l2toJSResult(`(if (and (> 3 2) (< 2 4)) 'yes 'no)`)).to.deep.equal(makeOk(`(((3 > 2) && (2 < 4)) ? "yes" : "no")`));
        });
        it("Q3 test 20", () => {
            expect(l2toJSResult(`((lambda (x) (if (eq? x 'a) 1 0)) 'a)`)).to.deep.equal(makeOk(`((x) => ((x === 'a') ? 1 : 0))('a')`));
        });
        it("Q3 test 21", () => {
            expect(l2toJSResult(`(define test (lambda (x) (if x 1 2)))`)).to.deep.equal(makeOk(`const test = ((x) => (x ? 1 : 2))`));
        });
        it("Q3 test 22", () => {
            expect(l2toJSResult(`(test #f)`)).to.deep.equal(makeOk(`test(false)`));
        });
        it("Q3 test 23", () => {
            expect(l2toJSResult(`((lambda (x) (if (and (number? x) (> x 0)) x 0)) 5)`)).to.deep.equal(makeOk(`((x) => (((typeof(x) === 'number') && (x > 0)) ? x : 0))(5)`));
        });
        it("Q3 test 24", () => {
            expect(l2toJSResult(`((lambda (x) (if (or (eq? x 'a) (eq? x 'b)) x 'none)) 'a)`)).to.deep.equal(makeOk(`((x) => (((x === 'a') || (x === 'b')) ? x : 'none'))('a')`));
        });
        it("Q3 test 25", () => {
            expect(l2toJSResult(`(define f (lambda (x y) (if (= x y) 'eq 'neq)))`)).to.deep.equal(makeOk(`const f = ((x,y) => ((x === y) ? 'eq' : 'neq'))`));
        });
        it("Q3 test 26", () => {
            expect(l2toJSResult(`(f 3 3)`)).to.deep.equal(makeOk(`f(3,3)`));
        });
        it("Q3 test 27", () => {
            expect(l2toJSResult(`((lambda (x) (if (not x) 0 1)) #t)`)).to.deep.equal(makeOk(`((x) => ((!x) ? 0 : 1))(true)`));
        });
        it("Q3 test 28", () => {
            expect(l2toJSResult(`(define check (lambda (x) (if (boolean? x) x #f)))`)).to.deep.equal(makeOk(`const check = ((x) => ((typeof(x) === 'boolean') ? x : false))`));
        });
        it("Q3 test 29", () => {
            expect(l2toJSResult(`(check #t)`)).to.deep.equal(makeOk(`check(true)`));
        });
        it("Q3 test 30", () => {
            expect(l2toJSResult(`((lambda (x y) (if (< x y) (+ x y) (- x y))) 5 10)`)).to.deep.equal(makeOk(`((x,y) => ((x < y) ? (x + y) : (x - y)))(5,10)`));
        });
        it("Q3 test 31", () => {
            expect(l2toJSResult(`(if (= (+ 1 1) (* 1 2)) 'match 'no)`)).to.deep.equal(makeOk(`(((1 + 1) === (1 * 2)) ? 'match' : 'no')`));
        });

        it("parses deeply nested function applications", () => {
            expect(l2toJSResult(
                "((((lambda (x) (lambda (y) (lambda (z) (+ x (+ y z))))) 1) 2) 3)"
            )).to.deep.equal(makeOk("((x) => ((y) => ((z) => (x + (y + z)))))(1)(2)(3)"));
        });
        it("parses type predicates", () => {
                expect(l2toJSResult("(boolean? #t)")).to.deep.equal(makeOk("(typeof(true) === 'boolean')"));
                expect(l2toJSResult("(number? 42)")).to.deep.equal(makeOk("(typeof(42) === 'number')"));
            });
    });

});