// src/types/index.ts
import type { Tables, TablesInsert, TablesUpdate } from './database'

// Row types (reading from DB)
export type Item = Tables<'items'>
export type Collection = Tables<'collections'>
export type ItemPhoto = Tables<'item_photos'>
export type ItemVisibilitySettings = Tables<'item_visibility_settings'>
export type ItemSave = Tables<'item_saves'>
export type ItemView = Tables<'item_views'>
export type ItemComment = Tables<'item_comments'>
export type ItemAiSuggestion = Tables<'item_ai_suggestions'>

// Insert types (writing to DB)
export type NewItem = TablesInsert<'items'>
export type NewCollection = TablesInsert<'collections'>
export type NewItemPhoto = TablesInsert<'item_photos'>

// Groq suggestion response
export type AiSuggestion = {
  name: string
  description: string
  suggested_size: string | null
}