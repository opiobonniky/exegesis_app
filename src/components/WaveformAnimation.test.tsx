/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import WaveformAnimation from './WaveformAnimation';

// ── Helpers ──

/** Render the component and return the test renderer instance + JSON tree */
async function render(ui: React.ReactElement) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(ui);
  });
  rendererRef = renderer;
  return {
    renderer,
    json: renderer.toJSON(),
  };
}

/** Count child views (bars) inside the waveform container */
function countBars(
  json: ReactTestRenderer.ReactTestRendererJSON,
): number {
  if (!json || typeof json === 'string') return 0;
  if (!json.children) return 0;
  return json.children.filter(
    (child): child is ReactTestRenderer.ReactTestRendererJSON =>
      child !== null && typeof child !== 'string',
  ).length;
}

/** Get the opacity value from the container's style */
function getContainerOpacity(
  json: ReactTestRenderer.ReactTestRendererJSON,
): number | undefined {
  if (!json || typeof json === 'string') return undefined;
  return json.props?.style?.opacity;
}

/** Get the first bar's backgroundColor from the style */
function getBarColor(
  json: ReactTestRenderer.ReactTestRendererJSON,
  index = 0,
): string | undefined {
  if (!json || typeof json === 'string' || !json.children) return undefined;
  const bar = json.children.filter(
    (c): c is ReactTestRenderer.ReactTestRendererJSON =>
      c !== null && typeof c !== 'string',
  )[index];
  if (!bar) return undefined;
  return bar.props?.style?.backgroundColor;
}

// ── Test-level cleanup ──
// Animated.loop timers keep running after a test ends. We must explicitly
// unmount each renderer so the cleanup useEffect fires and stops all loops.
let rendererRef: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(async () => {
  if (rendererRef) {
    await ReactTestRenderer.act(() => rendererRef.unmount());
    rendererRef = null;
  }
});

// ── Tests ──

describe('WaveformAnimation', () => {
  // ── Rendering basics ──

  describe('rendering basics', () => {
    it('renders the default 10 bars when active', async () => {
      const { json } = await render(<WaveformAnimation active={true} />);
      expect(countBars(json!)).toBe(10);
    });

    it('renders the default 10 bars when inactive', async () => {
      const { json } = await render(<WaveformAnimation active={false} />);
      expect(countBars(json!)).toBe(10);
    });

    it('renders with a custom barCount', async () => {
      const { json } = await render(<WaveformAnimation active={true} barCount={5} />);
      expect(countBars(json!)).toBe(5);
    });

    it('renders a single bar when barCount is 1', async () => {
      const { json } = await render(<WaveformAnimation active={true} barCount={1} />);
      expect(countBars(json!)).toBe(1);
    });

    it('renders no bars when barCount is 0', async () => {
      const { json } = await render(<WaveformAnimation active={true} barCount={0} />);
      expect(countBars(json!)).toBe(0);
    });
  });

  // ── Active vs inactive states ──

  describe('active vs inactive states', () => {
    it('has full opacity (1) when active', async () => {
      const { json } = await render(<WaveformAnimation active={true} />);
      expect(getContainerOpacity(json!)).toBe(1);
    });

    it('has reduced opacity (0.5) when inactive', async () => {
      const { json } = await render(<WaveformAnimation active={false} />);
      expect(getContainerOpacity(json!)).toBe(0.5);
    });

    it('uses the active color when active', async () => {
      const { json } = await render(
        <WaveformAnimation active={true} color="#00FF00" />,
      );
      expect(getBarColor(json!)).toBe('#00FF00');
    });

    it('uses the muted color when inactive', async () => {
      const { json } = await render(
        <WaveformAnimation active={false} mutedColor="#CCCCCC" />,
      );
      expect(getBarColor(json!)).toBe('#CCCCCC');
    });
  });

  // ── Custom props ──

  describe('custom props', () => {
    it('accepts a custom size', async () => {
      const { json } = await render(
        <WaveformAnimation active={true} size={32} />,
      );
      expect(json).not.toBeNull();
      if (json && typeof json !== 'string') {
        expect(json.props?.style?.height).toBe(32);
      }
    });

    it('accepts a custom gap', async () => {
      const { json } = await render(
        <WaveformAnimation active={true} gap={6} />,
      );
      expect(json).not.toBeNull();
      if (json && typeof json !== 'string') {
        expect(json.props?.style?.gap).toBe(6);
      }
    });

    it('uses default props when not specified', async () => {
      const { json } = await render(<WaveformAnimation active={true} />);
      expect(json).not.toBeNull();
      if (json && typeof json !== 'string') {
        expect(json.props?.style?.height).toBe(16);
        expect(json.props?.style?.gap).toBe(2);
      }
    });
  });

  // ── Accessibility ──

  describe('accessibility', () => {
    it('hides the waveform from screen readers when active', async () => {
      const { json } = await render(<WaveformAnimation active={true} />);
      expect(json).not.toBeNull();
      if (json && typeof json !== 'string') {
        expect(json.props?.accessibilityElementsHidden).toBe(true);
        expect(json.props?.importantForAccessibility).toBe(
          'no-hide-descendants',
        );
      }
    });

    it('hides the waveform from screen readers when inactive', async () => {
      const { json } = await render(<WaveformAnimation active={false} />);
      expect(json).not.toBeNull();
      if (json && typeof json !== 'string') {
        expect(json.props?.accessibilityElementsHidden).toBe(true);
        expect(json.props?.importantForAccessibility).toBe(
          'no-hide-descendants',
        );
      }
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('renders many bars without error', async () => {
      const { json } = await render(<WaveformAnimation active={true} barCount={50} />);
      expect(countBars(json!)).toBe(50);
    });

    it('handles toggling between active and inactive', async () => {
      let instance!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        instance = ReactTestRenderer.create(
          <WaveformAnimation active={true} />,
        );
      });
      rendererRef = instance;

      // Initially active
      let json = instance.toJSON();
      expect(getContainerOpacity(json!)).toBe(1);

      // Re-render as inactive
      await ReactTestRenderer.act(() => {
        instance.update(<WaveformAnimation active={false} />);
      });
      json = instance.toJSON();
      expect(getContainerOpacity(json!)).toBe(0.5);

      // Re-render back to active
      await ReactTestRenderer.act(() => {
        instance.update(<WaveformAnimation active={true} />);
      });
      json = instance.toJSON();
      expect(getContainerOpacity(json!)).toBe(1);
    });

    it('handles barCount changes during re-render', async () => {
      let instance!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        instance = ReactTestRenderer.create(
          <WaveformAnimation active={true} barCount={10} />,
        );
      });
      rendererRef = instance;

      let json = instance.toJSON();
      expect(countBars(json!)).toBe(10);

      // Reduce barCount
      await ReactTestRenderer.act(() => {
        instance.update(<WaveformAnimation active={true} barCount={3} />);
      });
      json = instance.toJSON();
      expect(countBars(json!)).toBe(3);

      // Increase barCount
      await ReactTestRenderer.act(() => {
        instance.update(<WaveformAnimation active={true} barCount={7} />);
      });
      json = instance.toJSON();
      expect(countBars(json!)).toBe(7);
    });
  });

  // ── Snapshots ──

  describe('snapshots', () => {
    it('matches snapshot for default active state (10 bars)', async () => {
      const { json } = await render(<WaveformAnimation active={true} />);
      expect(json).toMatchSnapshot();
    });

    it('matches snapshot for default inactive state', async () => {
      const { json } = await render(<WaveformAnimation active={false} />);
      expect(json).toMatchSnapshot();
    });

    it('matches snapshot with custom barCount and colors', async () => {
      const { json } = await render(
        <WaveformAnimation
          active={true}
          barCount={4}
          color="#22C55E"
          mutedColor="#E5E7EB"
          size={24}
          gap={4}
        />,
      );
      expect(json).toMatchSnapshot();
    });

    it('matches snapshot with custom props and inactive state', async () => {
      const { json } = await render(
        <WaveformAnimation
          active={false}
          barCount={6}
          color="#3B82F6"
          mutedColor="#9CA3AF"
          size={20}
          gap={3}
        />,
      );
      expect(json).toMatchSnapshot();
    });

    it('matches snapshot for single bar active', async () => {
      const { json } = await render(<WaveformAnimation active={true} barCount={1} />);
      expect(json).toMatchSnapshot();
    });

    it('matches snapshot for single bar inactive', async () => {
      const { json } = await render(<WaveformAnimation active={false} barCount={1} />);
      expect(json).toMatchSnapshot();
    });
  });
});
