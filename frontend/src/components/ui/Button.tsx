import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  children,
  className,
  leftIcon,
  rightIcon,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ className, size, variant })}
      type={type}
      {...props}
    >
      {leftIcon}
      <span className="truncate">{children}</span>
      {rightIcon}
    </button>
  )
}
