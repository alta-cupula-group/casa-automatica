// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRootUrl = new URL('../../../', import.meta.url);
const repoRoot = fileURLToPath(repoRootUrl);
const oxlintBin = fileURLToPath(
  new URL('node_modules/.bin/oxlint', repoRootUrl),
);
const configPath = fileURLToPath(new URL('.oxlintrc.json', repoRootUrl));

interface OxlintDiagnostic {
  code: string;
  filename: string;
}

interface OxlintReport {
  diagnostics: OxlintDiagnostic[];
}

// O oxlint escreve o código como `plugin(regra)`. O teste compara como `plugin/regra`.
function toRuleName(code: string): string {
  const match = /^([\w-]+)\((.+)\)$/.exec(code);
  return match ? `${match[1]}/${match[2]}` : code;
}

function lintFixture(fixture: string): string[] {
  if (!existsSync(configPath)) {
    throw new Error(`Configuração do oxlint não encontrada em ${configPath}.`);
  }
  const result = spawnSync(
    oxlintBin,
    ['-c', configPath, '-f', 'json', `apps/web/lint-fixtures/${fixture}`],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (result.error) {
    throw result.error;
  }
  const report = JSON.parse(result.stdout) as OxlintReport;
  return report.diagnostics.map((diagnostic) => toRuleName(diagnostic.code));
}

const cases = [
  {
    group: 'G1',
    rule: 'typescript/no-explicit-any',
    fixture: 'no-explicit-any.ts',
  },
  { group: 'G1', rule: 'eslint/prefer-const', fixture: 'prefer-const.ts' },
  {
    group: 'G2',
    rule: 'react-hooks/rules-of-hooks',
    fixture: 'rules-of-hooks.tsx',
  },
  {
    group: 'G2',
    rule: 'react/set-state-in-render',
    fixture: 'set-state-in-render.tsx',
  },
  {
    group: 'G3',
    rule: 'typescript/no-floating-promises',
    fixture: 'no-floating-promises.ts',
  },
  {
    group: 'G3',
    rule: 'typescript/no-unsafe-assignment',
    fixture: 'no-unsafe-assignment.ts',
  },
];

describe('configuração do oxlint', () => {
  it.each(cases)(
    '$group acusa só $rule em $fixture',
    ({ rule, fixture }) => {
      expect(lintFixture(fixture)).toEqual([rule]);
    },
    60_000,
  );
});
