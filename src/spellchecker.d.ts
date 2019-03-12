// todo: donate this to @types
declare module 'spellchecker' {
  /**
   * type returned by checkSpelling/checkSpellingAsync
   */
  export interface Range {
    start: number
    end: number
  }

  /**
   * Check if a word is misspelled
   *
   * @param {String} word to check
   */
  export function isMisspelled(word: string): boolean

  /**
   *
   */
  export function setDictionary(lang: string, path: string) : void

  /**
   *
   * @param word
   */
  export function add(word: string) : void

  export function remove(word: string) : void

  export function getAvailableDictionaries() : void

  /**
   * Get the corrections for a misspelled word.
   * @param word Word to get corrections for.
   * @returns a non-null but possibly empty array of string corrections.
   */
  export function getCorrectionsForMisspelling(word: string): string[]

  /**
   * helper func: resolves
   * default: /__dirname/../vendor/hunspell_dictionaries'
   */
  export function getDictionaryPath() : string

  /**
   * Identify misspelled words in a corpus of text.
   * @param corpus String corpus of text to spellcheck
   */
  export function checkSpelling(corpus: string) : Range[]

  /**
   * Identify misspelled words in a corpus of text.
   * @param corpus String corpus of text to spellcheck
   */
  export function checkSpellingAsync(corpus: string): Promise<Range[]>
}
