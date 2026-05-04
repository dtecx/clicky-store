import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles'

type LinkButtonProps = LinkProps & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  size?: ButtonSize
  variant?: ButtonVariant
}

export function LinkButton({
  children,
  className,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'primary',
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ className, size, variant })} {...props}>
      {leftIcon}
      <span className="truncate">{children}</span>
      {rightIcon}
    </Link>
  )
}
