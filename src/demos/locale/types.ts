export interface DemoStrings {
  title: string;
  description: string;
}

export interface Locale {
  banner: string;
  warmingUp: string;
  iterationNote: (n: number) => string;
  tableSizes: string;
  part1Header: string;
  part2Header: string;
  allComplete: string;
  demoFailed: string;

  withoutIndex: string;
  withIndex: string;
  noIndex: string;
  singleColIndex: string;
  compositeIndex: string;
  sqlWhereNoIndex: string;
  fetchAllJsFilter: string;
  sqlWhereWithIndex: string;

  medianOf: (n: number) => string;
  speedup: (factor: string) => string;
  slower: (factor: string) => string;
  samePerfResult: string;
  explainWithout: string;
  explainWith: string;
  explain: (label: string) => string;
  loadSimHeader: (count: number) => string;

  demos: {
    demo1: DemoStrings;
    demo2: DemoStrings;
    demo3: DemoStrings;
    demo4: DemoStrings;
    demo5: DemoStrings;
    demo6: DemoStrings;
    demo7: DemoStrings;
    demo8: DemoStrings;
    demo9: DemoStrings;
  };
}
