export type Violation = { file: string; line: number; message: string }
export function checkSource(file: string, source: string): Violation[]
export function checkProject(root: string): Violation[]
