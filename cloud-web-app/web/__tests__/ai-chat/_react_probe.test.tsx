import { describe, it, expect } from 'vitest'
import React from 'react'
import ReactDOM from 'react-dom'
import { render } from '@testing-library/react'

describe('react probe', () => {
  it('reports resolved react/react-dom', () => {
    console.log('REACT_VERSION', React.version)
    console.log('REACTDOM_VERSION', (ReactDOM as any).version)
    const { container } = render(React.createElement('div', null, 'hi'))
    console.log('RENDERED', container.innerHTML)
    expect(true).toBe(true)
  })
})
