import fs from "fs";
import { expect } from 'chai';
import {  evalL3program } from '../src/L3/L3-eval';
import { Value } from "../src/L3/L3-value";
import { Result, bind, makeOk } from "../src/shared/result";
import { parseL3 } from "../src/L3/L3-ast";




const q23: string = fs.readFileSync(__dirname + '/../src/q23.l3', { encoding: 'utf-8' });

const evalP = (x: string): Result<Value> =>
    bind(parseL3(x), evalL3program);

describe('Q23 Tests', () => {
    
   it("Q23 test 1", () => {
        expect(evalP(`(L3 ` + q23 + ` (get (dict '((a . 1) (b . 2))) 'b))`)).to.deep.equal(makeOk(2));
    });

    it("Q23 test 2", () => {
        expect(evalP(`(L3 ` + q23 + ` (dict? (dict '((a . 1) (b . 2)))))`)).to.deep.equal(makeOk(true));
    });

    it("Q23 test 3", () => {
        expect(evalP(`(L3 ` + q23 + ` (dict? '((1 . a) (2 . b))))`)).to.deep.equal(makeOk(false));
    });

    it("Q23 test 4", () => {
        expect(evalP(`(L3 ` + q23 + ` 
            (is-error? (get (dict '((a . 1) (b . 2))) 'c)))`
        )).to.deep.equal(makeOk(true));
    });

    it("Q23 test 5", () => {
        expect(evalP(`(L3 ` + q23 + `
                      (define d1 (dict '((a . 1) (b . 3))))
                      (define d2 (dict '((a . 1) (b . 2))))
                      (eq? d1 d2))`)).to.deep.equal(makeOk(false));
    }); 

    it("Q23 test 6", () => {
        expect(evalP(`(L3 ` + q23 + ` 
            (define x 1)
            (get 
              (if (< x 0)
                (dict '((a . 1) (b . 2)))
                (dict '((a . 2) (b . 1))))
            'a))`)).to.deep.equal(makeOk(2));
    });

    it("Q23 test 7", () => {
        expect(evalP(`(L3 ` + q23 + `  
            (bind (get (dict '((a . 1) (b . 2))) 'b) (lambda (x) (* x x))))`
        )).to.deep.equal(makeOk(4));
    });
    
    it("Q23 test 8", () => {
        expect(evalP(`(L3 ` + q23 + ` (get (dict '((k . 5))) 'k))`)).to.deep.equal(makeOk(5));
    });
    
    it("Q23 test 9", () => {
        expect(evalP(`(L3 ` + q23 + ` (is-error? (get (dict '((a . 1))) 'z)))`)).to.deep.equal(makeOk(true));
    });
    
    it("Q23 test 10", () => {
        expect(evalP(`(L3 ` + q23 + ` (dict? (dict '())))`)).to.deep.equal(makeOk(true));
    });
    
    it("Q23 test 11", () => {
        expect(evalP(`(L3 ` + q23 + ` (bind (get (dict '((a . 2) (b . 3))) 'a) (lambda (x) (+ x 8))))`)).to.deep.equal(makeOk(10));
    });
    
    it("Q23 test 12", () => {
        expect(evalP(`(L3 ` + q23 + ` (is-error? (bind (get (dict '((a . 2) (b . 3))) 'z) (lambda (x) (+ x 8)))))`)).to.deep.equal(makeOk(true));
    });
    
    it("Q23 test 13", () => {
        expect(evalP(`(L3 ` + q23 + ` (is-error? (bind (get (dict '((x . 100))) 'y) (lambda (v) (+ v 1)))))`)).to.deep.equal(makeOk(true));
    });
    
    it("Q23 test 14", () => {
        expect(evalP(`(L3 ` + q23 + ` (bind (get (dict '((x . 4))) 'x) (lambda (v) (* v 10))))`)).to.deep.equal(makeOk(40));
    });
    
    it("Q23 test 15", () => {
        expect(evalP(`(L3 ` + q23 + ` (is-error? (get (dict '()) 'missing)))`)).to.deep.equal(makeOk(true));
    });
    
    it("Q23 test 16", () => {
        expect(evalP(`(L3 ` + q23 + ` (dict? '((a . 1) (b . 2))))`)).to.deep.equal(makeOk(true));
    });
    
    it("Q23 test 17", () => {
        expect(evalP(`(L3 ` + q23 + ` (dict? '((a b) (c d))))`)).to.deep.equal(makeOk(false));
    });
    
    // it("Q23 test 18", () => {
    //     expect(evalP(`(L3 ` + q23 + ` (is-error? make-error))`)).to.deep.equal(makeOk(true));
    // });
    
    // it("Q23 test 19", () => {
    //     expect(evalP(`(L3 ` + q23 + ` (is-error? (bind make-error (lambda (x) (+ x 100)))))`)).to.deep.equal(makeOk(true));
    // });
    
    it("Q23 test 20", () => {
        expect(evalP(`(L3 ` + q23 + ` (bind 7 (lambda (x) (+ x 10))))`)).to.deep.equal(makeOk(17));
    });
    
    // it("Q23 test 21", () => {
    //     expect(evalP(`(L3 ` + q23 + ` (is-error? (bind make-error (lambda (x) (* x x)))))`)).to.deep.equal(makeOk(true));
    // });
    
    it("Q23 test 22", () => {
        expect(evalP(`(L3 ` + q23 + ` (bind 5 (lambda (x) (* x x))))`)).to.deep.equal(makeOk(25));
    });
    
    
    
});