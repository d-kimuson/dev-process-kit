# `src/@types`

このディレクトリだけ `interface` を許可する。

理由は、宣言マージとモジュール拡張（`declare module '...' { interface X { ... } }`）が
`interface` を必要とするためである。それ以外の場所では `type` エイリアスを使う
（`typescript/consistent-type-definitions` が `src/**` で `type` を強制し、
`src/@types/**/*.d.ts` だけを例外にしている）。

現時点でこのディレクトリに宣言は無い。必要になったときに `.d.ts` をここへ置く。
