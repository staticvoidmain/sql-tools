// todo: donate this to @types
declare module 'spellchecker' {
  /**
   * type returned by checkSpelling/checkSpellingAsync
   */
  export interface Range {
    start: number
    end: number
  }

  export function isMisspelled(word: string): boolean

  export function setDictionary(lang: string, path: string) : void

  export function add(word: string) : void

  export function remove(word: string) : void

  export function getAvailableDictionaries() : void

  export function getCorrectionsForMisspelling(word: string): string[]

  export function getDictionaryPath() : string


  /**
   * Identify misspelled words in a corpus of text.
   * @param corpus
   */
  export function checkSpelling(corpus: string) : Range[]

  /**
   * Identify misspelled words in a corpus of text.
   * @param corpus
   */
  export function checkSpellingAsync(corpus: string): Promise<Range[]>
}
