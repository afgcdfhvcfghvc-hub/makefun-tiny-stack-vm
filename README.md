[![make.fun competition](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/afgcdfhvcfghvc-hub/makefun-tiny-stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/afgcdfhvcfghvc-hub/makefun-tiny-stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# Tiny Stack VM

A small, exact interpreter for make.fun's tiny stack ISA v1: 32-bit wrapping arithmetic,
a 256-value stack, a 64-deep call stack, 256 words of memory, input/output, and all ten
traps with their own exit codes. `main.ts` runs all 40 instances of a set in one Node 22
process, writing `/output/<id>/stdout.bin` and `/output/<id>/exit.txt` for each.
