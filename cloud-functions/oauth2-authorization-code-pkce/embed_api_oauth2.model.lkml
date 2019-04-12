connection: "..." 
# Provide a BigQuery connection with PDT support. 
# (Preferably with a separate PDT connection that end users cannot query, to keep the rotating secret inaccessible)

include: "auth.dashboard.lookml"

explore: auth {}
view: auth {
	### Configure this URL ###
	parameter: intermediary_url {
	  # $s = slash, $c = colon, $d = dash
	  type: unquoted
	  default_value: ""
	  allowed_value: {value: "https$c$s$sus$dcentral1$ddata$dproto.cloudfunctions.net$soauth2$dauthorization$dcode$dpkce"}
	}
  ### Do not change below here ###
  derived_table: {
    sql_trigger_value: SELECT UNIX_SECONDS(TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), DAY)) ;;
    sql: SELECT SHA256(CONCAT(
        CAST(RAND() as STRING),
        CAST(RAND() as STRING),
        CAST(RAND() as STRING)
      )) as rotating_secret
    ;;
  }
  parameter: app_name {
    type: string
  }
  dimension: claim_cha {hidden:yes sql:"{{cha._parameter_value}}";;}
  dimension: claim_exp {hidden:yes sql:CAST((UNIX_SECONDS(CURRENT_TIMESTAMP()) + 5*60) as STRING);;}
  dimension: claim_sta {hidden:yes sql:"{{sta._parameter_value}}";;}
  dimension: claim_uid {hidden:yes sql:CAST({{_user_attributes['id']}} as STRING);;}
  dimension: claim_url {hidden:yes sql:"{{url._parameter_value}}";;}
  dimension: claim {hidden:yes
    sql: CONCAT('{',
      '"cha":"', ${claim_cha} , '",',
      '"exp":' , ${claim_exp} ,  ',',
      '"sta":"', ${claim_sta} , '",',
      '"uid":"', ${claim_uid} , '",',
      '"url":"', ${claim_url} , '"',
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
    html: <div style="font-size:14pt; text-align:center">
          <img
           style="height:20px;width:640px"
           src="{{intermediary_url._parameter_value | replace: '$s','/' | replace: '$c',':' | replace: '$d','-'}}/badge?url={{claim_url._value}}"
           alt="[Application name]"
          />
          <br />
          wants to use Looker as
          <br />
          {{_user_attributes['name']}}
          <br /><br />
          <a style="background-color:#33c;color:#fff;border-radius:0.75em;padding:0.25em 3em;margin:1em 0"
          href="{{intermediary_url._parameter_value | replace: '$s','/' | replace: '$c',':' | replace: '$d','-'}}/verify?cha={{claim_cha._value}}&exp={{claim_exp._value}}&uid={{claim_uid._value}}&sta={{claim_sta._value}}&url={{claim_url._value}}&sig={{value}}"
          >Grant</a>
          <br /><span style="color:rgba(255,255,255,0)">-</span>
          </div>
    ;;
  }

  parameter: cha {hidden: yes type: unquoted} #Challenge (provided by App)
  parameter: exp {hidden: yes type: number} #Expiration (provided by Looker/DWH)
  parameter: uid {hidden: yes type: string} #User Id (provided by Looker)
  parameter: sig {hidden: yes type: string} #Signature (provided by Looker/DWH)
  parameter: sta {hidden: yes type: unquoted} #State (provided by App)
  parameter: url {hidden: yes type: unquoted} #URL (provided by App, whitelisted by GCF)

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
  dimension: check_claim {hidden:yes
    sql: CONCAT('{',
      '"cha":"{% parameter cha %}",',
      '"exp":{% parameter exp %},',
      '"sta":"{% parameter sta %}",',
      '"uid":"',{% parameter uid %},'",',
      '"url":"{% parameter url %}"',
      '}'
    );;
  }
}
