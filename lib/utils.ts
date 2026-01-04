import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Функция для склонения возраста (1 год, 2 года, 5 лет)
export function formatAge(age: number): string {
  const lastDigit = age % 10
  const lastTwoDigits = age % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${age} лет`
  }
  
  if (lastDigit === 1) {
    return `${age} год`
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${age} года`
  }
  
  return `${age} лет`
}
