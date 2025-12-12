import { useMemo } from 'react';
import { CustomQuestion, ConditionalDisplay } from '@/types/widget';

/**
 * Evaluates whether a conditional display rule should show the field
 */
export function evaluateCondition(
  condition: ConditionalDisplay,
  currentAnswers: Record<string, string>
): boolean {
  const dependentValue = currentAnswers[condition.dependsOn] || '';
  const operator = condition.operator || 'equals';
  const targetValues = Array.isArray(condition.showWhen)
    ? condition.showWhen
    : [condition.showWhen];

  switch (operator) {
    case 'equals':
      return targetValues.some(target =>
        dependentValue.toLowerCase() === target.toLowerCase()
      );

    case 'notEquals':
      return targetValues.every(target =>
        dependentValue.toLowerCase() !== target.toLowerCase()
      );

    case 'contains': {
      // For checkbox fields (comma-separated values)
      const selectedValues = dependentValue.split(',').map(v => v.trim().toLowerCase());
      return targetValues.some(target =>
        selectedValues.includes(target.toLowerCase())
      );
    }

    case 'notContains': {
      const selectedVals = dependentValue.split(',').map(v => v.trim().toLowerCase());
      return targetValues.every(target =>
        !selectedVals.includes(target.toLowerCase())
      );
    }

    case 'isEmpty':
      return !dependentValue || dependentValue.trim() === '';

    case 'isNotEmpty':
      return !!dependentValue && dependentValue.trim() !== '';

    default:
      return true;
  }
}

/**
 * Hook to determine if a specific question should be visible
 */
export function useConditionalField(
  question: CustomQuestion,
  currentAnswers: Record<string, string>
): boolean {
  return useMemo(() => {
    // No conditional display = always visible
    if (!question.conditionalDisplay) {
      return true;
    }

    return evaluateCondition(question.conditionalDisplay, currentAnswers);
  }, [question.conditionalDisplay, currentAnswers]);
}

/**
 * Hook to filter visible questions based on conditional logic
 */
export function useVisibleQuestions(
  questions: CustomQuestion[],
  currentAnswers: Record<string, string>
): CustomQuestion[] {
  return useMemo(() => {
    return questions.filter(question => {
      if (!question.conditionalDisplay) {
        return true;
      }
      return evaluateCondition(question.conditionalDisplay, currentAnswers);
    });
  }, [questions, currentAnswers]);
}

/**
 * Check if a question should be visible (non-hook version for use in loops)
 */
export function isQuestionVisible(
  question: CustomQuestion,
  currentAnswers: Record<string, string>
): boolean {
  if (!question.conditionalDisplay) {
    return true;
  }
  return evaluateCondition(question.conditionalDisplay, currentAnswers);
}
