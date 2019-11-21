const curry = (f: Function) => (a: any, ..._: any[]) =>
    _.length ? f(a, ..._) : (..._: any[]) => f(a, ..._);

const take = (l: number, iter: Iterable<any>) => {
    let res = [];
    let i = 0;
    for (const a of iter) {
        res.push(a);
        if (++i > l) break;
    }
    return res;
};

const reduce = (f: Function, acc: any, iter: Iterable<any>) => {
    for (const a of iter) {
        acc = f(acc, a);
    }
    return acc;
};

export default { curry, take, reduce };
