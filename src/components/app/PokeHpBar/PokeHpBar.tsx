import * as React from 'react';
import cx from 'classnames';
import { useColorScheme } from '@showdex/components/app';
import styles from './PokeHpBar.module.scss';

export interface PokeHpBarProps {
  className?: string;
  style?: React.CSSProperties;

  /**
   * Current HP of the Pokemon, represented as a decimal percentage.
   *
   * * Valid range: `[0, 1]`
   *
   * @default 0
   * @since 0.1.2
   */
  hp?: number;

  /**
   * Width of the HP bar, in *pixels*.
   *
   * @default 85
   * @since 0.1.2
   */
  width?: number;
}

export const PokeHpBar = ({
  className,
  style,
  hp = 0,
  width = 85,
}: PokeHpBarProps): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <span
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        className,
      )}
      style={{ width, ...style }}
    >
      <span
        className={styles.value}
        style={{ width: `${(hp * 100).toFixed(4)}%` }}
      />
    </span>
  );
};
