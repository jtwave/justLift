export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          followers_count: number
          following_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          followers_count?: number
          following_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          followers_count?: number
          following_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      workout_posts: {
        Row: {
          id: string
          workout_id: string
          user_id: string
          caption: string | null
          is_public: boolean
          likes_count: number
          comments_count: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          user_id: string
          caption?: string | null
          is_public?: boolean
          likes_count?: number
          comments_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          user_id?: string
          caption?: string | null
          is_public?: boolean
          likes_count?: number
          comments_count?: number
          created_at?: string
        }
      }
      workout_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      workout_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          category: string
          created_at: string
          instructions: string[]
          image_url_1: string | null
          image_url_2: string | null
          force: string | null
          level: string | null
          mechanic: string | null
          equipment: string | null
          primaryMuscles: string[]
          secondaryMuscles: string[]
          tracking_type: string
          default_duration: number
          supports_distance: boolean
          supports_calories: boolean
        }
        Insert: {
          id?: string
          name: string
          category: string
          created_at?: string
          instructions?: string[]
          image_url_1?: string | null
          image_url_2?: string | null
          force?: string | null
          level?: string | null
          mechanic?: string | null
          equipment?: string | null
          primaryMuscles?: string[]
          secondaryMuscles?: string[]
          tracking_type?: string
          default_duration?: number
          supports_distance?: boolean
          supports_calories?: boolean
        }
        Update: {
          id?: string
          name?: string
          category?: string
          created_at?: string
          instructions?: string[]
          image_url_1?: string | null
          image_url_2?: string | null
          force?: string | null
          level?: string | null
          mechanic?: string | null
          equipment?: string | null
          primaryMuscles?: string[]
          secondaryMuscles?: string[]
          tracking_type?: string
          default_duration?: number
          supports_distance?: boolean
          supports_calories?: boolean
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          start_time: string
          end_time: string | null
          is_active: boolean
          routine_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          start_time: string
          end_time?: string | null
          is_active?: boolean
          routine_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          is_active?: boolean
          routine_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string 
          exercise_id: string
          is_active: boolean
          rest_time: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          is_active?: boolean
          rest_time?: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_id?: string
          is_active?: boolean
          rest_time?: number
          order_index?: number
          created_at?: string
        }
      }
      workout_sets: {
        Row: {
          id: string
          workout_exercise_id: string
          set_number: number
          weight: number
          reps: number
          completed: boolean
          is_pr: boolean
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          workout_exercise_id: string
          set_number: number
          weight: number
          reps: number
          completed?: boolean
          is_pr?: boolean
          timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          workout_exercise_id?: string
          set_number?: number
          weight?: number
          reps?: number
          completed?: boolean
          is_pr?: boolean
          timestamp?: string
          created_at?: string
        }
      }
      workout_routines: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      routine_exercises: {
        Row: {
          id: string
          routine_id: string
          exercise_id: string
          order_index: number
          default_rest_time: number
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          exercise_id: string
          order_index: number
          default_rest_time?: number
          created_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          exercise_id?: string
          order_index?: number
          default_rest_time?: number
          created_at?: string
        }
      }
      progress_photos: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_url?: string
          notes?: string | null
          created_at?: string
        }
      }
      body_weight_entries: {
        Row: {
          id: string
          user_id: string
          weight: number
          notes: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight: number
          notes?: string | null
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight?: number
          notes?: string | null
          recorded_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}