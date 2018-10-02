connection: ""

include: "init.dashboard.lookml"

explore: auth {}
view: auth {
  derived_table: {
    sql_trigger_value: SELECT UNIX_SECONDS(TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), DAY)) ;;
    sql: SELECT SHA256(CONCAT(
        CAST(RAND() as STRING),
        CAST(RAND() as STRING),
        CAST(RAND() as STRING)
      )) as rotating_secret
    ;;
  }
  parameter: external_url {
    # $s = slash, $c = colon, $d = dash
    type: unquoted
    default_value: "http$c$s$slocalhost$c3000$s"
    allowed_value: {value: "https$c$s$slooker.github.io$svelocity$ddashboards$s"}
    allowed_value: {value: "http$c$s$slocalhost$c3000$s"}
  }
  parameter: external_state {
    type: unquoted
  }
  parameter: external_window {
    type: unquoted
    default_value: "_parent"
  }
  dimension: _aud {hidden: yes sql: SUBSTR(TO_HEX(SHA256("{{external_url._parameter_value}}")),0,8);;}
  dimension: _exp {hidden: yes sql: CAST((UNIX_SECONDS(CURRENT_TIMESTAMP()) + 5*60) as STRING);;}
  dimension: _sub {hidden: yes sql: CAST({{_user_attributes['id']}} as STRING);;}
  dimension: claim {hidden:yes
    sql: CONCAT('{',
      '"aud":"',${_aud},'",',
      '"exp":',${_exp},',',
      '"sub":"',${_sub},'"',
      '}'
    );;
  }
  dimension: get_signature {
    type: string
    sql: TO_HEX(SHA256(CONCAT(
          RPAD(${TABLE}.rotating_secret,32,b'\x00')
          ^ b'\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c'
          ,SHA256(CONCAT(
            RPAD(${TABLE}.rotating_secret,32,b'\x00')
            ^ b'\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36'
            , CAST(${claim} as BYTES)
          ))
        )))
    ;;
    html: <div>
          <span style="color:#33c">
          {{external_url._parameter_value | replace: '$s','/' | replace: '$c',':' | replace: '$d','-'}}
          </span>
          wants to use
          <br />
          <span style="color:#33c">
          Looker
          </span>
          as {{_user_attributes['name']}}
          <br />
          <a style="background-color:#33c;color:#fff;border-radius:0.75em;padding:0.25em 3em;margin:1em 0"
          target="{{external_window._parameter_value}}"
          href="{{external_url._parameter_value | replace: '$s','/' | replace: '$c',':' | replace: '$d','-'}}#/auth&aud={{_aud._value}}&exp={{_exp._value}}&sub={{_sub._value}}&sig={{value}}&state={{external_state._parameter_value}}"
          >Grant</a>
          <br /><span style="color:rgba(255,255,255,0)">-</span>
          </div>
    ;;
  }


  parameter: aud {
    type: unquoted
    hidden: yes
  }
  parameter: exp {
    type: number
    hidden: yes
  }
  parameter: sub {
    type: unquoted
    hidden: yes
  }
  parameter: sig {
    type: string
    hidden: yes
  }
  dimension: check {
    hidden: yes
    type: yesno
    sql: {% parameter sig %} = TO_HEX(SHA256(CONCAT(
          RPAD(${TABLE}.rotating_secret,32,b'\x00')
          ^ b'\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c\x5c'
          ,SHA256(CONCAT(
            RPAD(${TABLE}.rotating_secret,32,b'\x00')
            ^ b'\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36\x36'
            , CAST(${check_claim} as BYTES)
          ))
        ))) ;;
  }
  dimension: check_claim {
    hidden: yes
    sql: '{"aud":"{% parameter aud %}","exp":{% parameter exp %},"sub":"{% parameter sub %}"}' ;;
  }
}
