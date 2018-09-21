connection: "a-bigquery-connection"

datagroup: secret_refresh {
	sql_trigger: SELECT EXTRACT(HOUR FROM CURRENT_TIMESTAMP())
}
explore: secret {}
view: secret {
	derived_table: {
		sql: SELECT 
			CAST(CURRENT_TIMESTAMP() as STRING) as ts,
			SHA256(CONCAT(
				CAST(RAND() as STRING),
				${TRIGGER_VALUE},
				CAST(RAND() as STRING)
			)) as secret
		;;
	}
	parameter: external_url {
		# $s = slash, $c = colon, $d = dash
		type: unquoted
		default_value: "http$c$s$slocalhost$c3000$s"
		allowed_value: {value: "https$c$s$slooker.github.io$svelocity$ddashboards$s"}
		allowed_value: {value: "http$c$s$slocalhost$c3000$s"}
	}
	dimension: ts{ hidden: yes }
	dimension: signed{
		type: string
		sql: TO_HEX(SHA256(CONCAT(
			,${TABLE}.secret
			-- ^ 0x5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c
			,SHA256(CONCAT(
				${TABLE}.secret
				-- ^ 0x3636363636363636363636363636363636363636363636363636363636363636
				, CAST(
					CONCAT(
						${ts},
						,"-"
						,{{_user_attributes['user_id']}}
					) as BYTES
				)
			))
		)));;
		html: <a target="_parent"
			href="{{external_url._parameter_value | replace: '$s','/' | replace: '$c',':' | replace: '$d','-'}}#/auth&uid={{_user_attributes["user_id"}}&ts={{ts._value}}&sig={{signed._value}}">
			Click to grant {{external_url._parameter_value | replace: '$s','/' | replace: '$c',':' | replace: '$d','-'}} access to use Looker on your behalf</a>
		;;
	}
}