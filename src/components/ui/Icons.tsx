import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const defaultProps: IconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M3 12H21" />
      <path d="M3 6H21" />
      <path d="M3 18H21" />
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M18 6L6 18" />
      <path d="M6 6L18 18" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1V4" />
      <path d="M12 20V23" />
      <path d="M4.22 4.22L6.34 6.34" />
      <path d="M17.66 17.66L19.78 19.78" />
      <path d="M1 12H4" />
      <path d="M20 12H23" />
      <path d="M4.22 19.78L6.34 17.66" />
      <path d="M17.66 6.34L19.78 4.22" />
    </svg>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1V3" />
      <path d="M12 21V23" />
      <path d="M4.22 4.22L5.64 5.64" />
      <path d="M18.36 18.36L19.78 19.78" />
      <path d="M1 12H3" />
      <path d="M21 12H23" />
      <path d="M4.22 19.78L5.64 18.36" />
      <path d="M18.36 5.64L19.78 4.22" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21L16.65 16.65" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M3 6H5H21" />
      <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" />
    </svg>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 2V8H15" />
      <path d="M3 12C3 7.02944 7.02944 3 12 3C15.3019 3 18.1885 4.77814 19.7545 7.42909L21 8" />
      <path d="M3 22V16H9" />
      <path d="M21 12C21 16.9706 16.9706 21 12 21C8.69813 21 5.81149 19.2219 4.24548 16.5709L3 16" />
    </svg>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M20 6L9 17L4 12" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M6 9L12 15L18 9" />
    </svg>
  )
}

export function MessageIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function BotIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7V11" />
      <path d="M8 16H8.01" />
      <path d="M16 16H16.01" />
    </svg>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 3L13.4 8.6L19 10L13.4 11.4L12 17L10.6 11.4L5 10L10.6 8.6L12 3Z" />
      <path d="M5 3L5.5 5L7 5.5L5.5 6L5 8L4.5 6L3 5.5L4.5 5L5 3Z" />
      <path d="M19 17L19.5 19L21 19.5L19.5 20L19 22L18.5 20L17 19.5L18.5 19L19 17Z" />
    </svg>
  )
}
