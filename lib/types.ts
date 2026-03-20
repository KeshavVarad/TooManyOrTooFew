export type QuestionType = 'scale' | 'multiple_choice' | 'multi_select' | 'open_ended';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  order_index: number;
  created_at: string;
}

export interface Response {
  id: string;
  submitted_at: string;
  session_id?: string;
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  value: AnswerValue;
  is_featured: boolean;
  created_at: string;
}

export type AnswerValue =
  | { type: 'scale'; score: number }
  | { type: 'multiple_choice'; choice: string }
  | { type: 'multi_select'; choices: string[] }
  | { type: 'open_ended'; text: string };
