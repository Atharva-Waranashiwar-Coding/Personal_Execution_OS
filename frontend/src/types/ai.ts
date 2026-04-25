export type DateTimeString = string;

// Matches backend AICommandToolCallResponse schema
export interface AICommandToolCall {
  id: number;
  tool_name: string;
  arguments: string | null;     // raw JSON string from backend
  result_payload: string | null; // raw JSON string from backend
  status: string;
  error_message: string | null;
  sequence_number: number;
}

// Matches backend AICommandResponse schema
export interface AICommandResponse {
  id: number;
  message: string;
  intent: string | null;
  status: string;
  assistant_message: string | null;
  extracted_payload: string | null;  // raw JSON string
  created_resources: string | null;  // raw JSON string
  error_message: string | null;
  created_at: DateTimeString;
  tool_calls: AICommandToolCall[];
}

// POST /ai/command
export interface AICommandCreate {
  message: string;
  context?: Record<string, unknown> | null;
}

// POST /ai/commands/{id}/revise
export interface AICommandRevise {
  message: string;
}
