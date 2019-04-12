- dashboard: auth
  title: Embed Auth UI
  layout: grid
  rows:
    - elements: [embed_auth_ui]
      height: 600
  embed_style:
    background_color: "#f6f8fa"
    show_title: false
    title_color: "#3a4245"
    show_filters_bar: false
    tile_text_color: "#3a4245"
    text_tile_text_color: ''
  elements:
    - title: Embed Auth UI
      name: embed_auth_ui
      model: embed_api_oauth2
      explore: auth
      type: single_value
      fields:
      - auth.get_signature
      sorts:
      - auth.get_signature
      limit: 500
      query_timezone: America/Los_Angeles
      refresh: 15 minutes
      custom_color_enabled: false
      custom_color: forestgreen
      show_single_value_title: false
      single_value_title: ''
      show_comparison: false
      comparison_type: value
      comparison_reverse_colors: false
      show_comparison_label: true
      show_view_names: false
      show_row_numbers: false
      truncate_column_names: false
      hide_totals: false
      hide_row_totals: false
      table_theme: editable
      limit_displayed_rows: false
      enable_conditional_formatting: false
      conditional_formatting_include_totals: false
      conditional_formatting_include_nulls: false
      series_types: {}
      listen:
        intermediary_url: auth.intermediary_url
        cha: auth.cha
        sta: auth.sta
        url: auth.url
      row: 0
      col: 0
      width: 24
      height: 8
  filters:
  - name: intermediary_url
    title: intermediary_url
    type: string_filter
    default_value: ''
    allow_multiple_values: false
    required: true
  - name: cha
    title: cha
    type: string_filter
    default_value: ''
    allow_multiple_values: false
    required: true
  - name: sta
    title: sta
    type: string_filter
    default_value: ''
    allow_multiple_values: false
    required: true
  - name: url
    title: url
    type: string_filter
    default_value: ''
    allow_multiple_values: false
    required: true
  - name: app_name
    title: app_name
    type: string_filter
    default_value: ''
    allow_multiple_values: false
    required: false
