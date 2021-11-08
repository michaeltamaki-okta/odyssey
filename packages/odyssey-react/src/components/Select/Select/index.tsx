/*!
 * Copyright (c) 2021-present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

import React, { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement, ComponentPropsWithRef } from "react";
import { SelectOption } from "../SelectOption";
import { SelectOptionGroup } from "../SelectOptionGroup";
import { useChoices } from "./useChoices";
import {
  forwardRefWithStatics,
  useOid,
  useOmit,
  withStyles,
} from "../../../utils";
import { Field } from "../../Field";
import type { SharedFieldTypes } from "../../Field/types";

import styles from "../Select.module.scss";
import { CaretDownIcon } from "../../Icon";
import { CircularLoadIndicator } from "../..";

/**
 * For discussion - not implemented.
 *
 * Concept would be Select controlling what props are passed to VisibleComponent
 * when the visibleOptions are rendered.
 *
 * Meets requirement of significantly customized visible options which is currently
 * not achieveable given hiding of choices callbackOnCreateTemplates
 */

type VisibleOptionProps<U extends Record<string, unknown>> = {
  label: string;
  value: string;
  data: U;
};

type OnSearchHandler<U> = U extends Record<string, unknown>
  ? (
      searchText: string,
      setVisibleOptions: (options: VisibleOptionProps<U>[]) => void
    ) => Promise<void>
  : never;

interface CommonProps
  extends SharedFieldTypes,
    Omit<ComponentPropsWithRef<"select">, "onChange" | "style" | "className"> {
  /**
   * One or more options or option groups to be used together as a group
   */
  children: ReactElement | ReactElement[];

  /**
   * The underlying select element id attribute. Automatically generated if not provided
   */
  id?: string;
  /**
   * The underlying select element name attribute for the group
   */
  name: string;

  /**
   * The underlying select element required attribute for the group
   * @default true
   */
  required?: boolean;

  /**
   * The underlying select element disabled attribute for the group
   * @default false
   */
  disabled?: boolean;

  /**
   * The selected option value attribute for a controlled group.
   */
  value?: string;

  /**
   * Callback executed when the select fires a change event
   * @param {Object} event the event object
   * @param {string} value the string value of the select
   */
  onChange?: (event?: ChangeEvent<HTMLSelectElement>, value?: string) => void;

  /**
   * The text that is shown when all options are already selected,
   * or a user's search has returned no results.
   */
  noResultsText?: string;
}

interface MultipleProps extends CommonProps {
  multiple: true;
  /**
   * The text that is shown when a user has selected all possible choices.
   */
  noChoicesText?: string;
}

interface SingleProps extends CommonProps {
  multiple?: false;
  noChoicesText?: never;
}

interface SearchMultipleProps extends MultipleProps {
  /**
   * Callback executed when the select fires a search event.
   * Loading state will be displayed until the promise resolves with true.
   * @param {string} The user entered text
   * @param {Function} A callback that can be used to show visible options which are
   *                   out of sync with the children of the Select.
   * @returns {boolean} Whether
   */
  onSearch: OnSearchHandler<Record<string, unknown>>;
  loadingText: string;
}

function isSearchMultiple(props: SelectProps): props is SearchMultipleProps {
  const searchMultiple = props as SearchMultipleProps;
  return (
    searchMultiple.onSearch !== undefined &&
    searchMultiple.loadingText !== undefined
  );
}

export type SelectProps = MultipleProps | SingleProps | SearchMultipleProps;

/**
 * Often referred to as a "dropdown menu" this input triggers a menu of
 * options a user can select.
 */
let Select = forwardRefWithStatics<HTMLSelectElement, SelectProps, Statics>(
  (props, ref) => {
    const {
      id,
      children,
      disabled = false,
      name,
      onChange,
      required = true,
      value,
      error,
      hint,
      label,
      optionalLabel,
      noResultsText = "",
      noChoicesText = "",
      ...rest
    } = props;

    const [loading, setLoading] = useState<boolean>(false);

    const omitProps = useOmit(rest);

    const oid = useOid(id);

    const loadingText = isSearchMultiple(props) ? props.loadingText : "";

    const baseUseChoicesProps = {
      id: oid,
      value,
      noResultsText,
      noChoicesText,
    };

    let useChoicesProps;

    if (isSearchMultiple(props)) {
      const { onSearch: composerSearch } = props;
      useChoicesProps = {
        ...baseUseChoicesProps,
        onSearch: useCallback(
          async (...args: Parameters<typeof composerSearch>) => {
            setLoading(true);
            // TBD - debounce?
            await composerSearch(...args);
            setLoading(false);
          },
          [composerSearch]
        ),
        loadingText: loadingText,
      };
    } else {
      useChoicesProps = baseUseChoicesProps;
    }

    useChoices(useChoicesProps);

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) => {
        onChange?.(event, event.target.value);
      },
      [onChange]
    );

    return (
      <Field
        error={error}
        hint={hint}
        inputId={oid}
        label={label}
        optionalLabel={optionalLabel}
        required={required}
      >
        <div className={styles.outer}>
          {/* eslint-disable-next-line jsx-a11y/no-onchange */}
          <select
            {...omitProps}
            id={oid}
            name={name}
            disabled={disabled}
            required={required}
            onChange={handleChange}
            value={value}
            ref={ref}
          >
            {children}
          </select>
          <span className={styles.indicator} role="presentation">
            {loading ? (
              <CircularLoadIndicator
                aria-label={loadingText}
                aria-valuetext={loadingText}
              />
            ) : null}
            <CaretDownIcon />
          </span>
        </div>
      </Field>
    );
  }
);

Select.displayName = "Select";

interface Statics {
  Option: typeof SelectOption;
  OptionGroup: typeof SelectOptionGroup;
}

Select.Option = SelectOption;
Select.OptionGroup = SelectOptionGroup;

Select = withStyles(styles)(Select);

export { Select };
