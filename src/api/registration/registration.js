const { Pool } = require('pg')

const register = async (request, response) => {
    const { lastName, firstName, middleName, username, password } = request.body
    lastName = lastName.trim().toLowerCase()
    firstName = lastName.trim().toLowerCase()
    if (!middleName) {
        middleName = middleName.trim().toLowerCase()
    } else {
        middleName = ''
    }
    username = username.trim()
    password = password.trim()

    if (!lastName || !firstName || !username || !password) {
        return response.status(200).json({
            error: "Please fill up required fields."
        })
    }

    const pool = new Pool()

    var registerQuery = "INSERT INTO chat_user (last_name, first_name, middle_name, chat_username, chat_password) VALUES ($1, $2, $3, $4, $5)"
    
    console.log(registerQuery)
    pool.query(registerQuery, [lastName, firstName, middleName, username, password], (error, results) => {
        pool.end()
        if (error) {
            if (error.code == 23505) {
                console.log("Username already registered. Please use a different username.")
                return response.status(200).json({
                    code: "1",
                    error: "Username already registered. Please use a different username."
                })
            }
            return response.status(200).json({
                code: "1",
                error: "An error has occured. Please try again."
            })
        }
        if (results) {
            if (results.rowCount > 0) {
                return response.status(200).json({
                    code: "0",
                    success: "Registration successful."
                })
            } else {
                return response.status(200).json({
                    code: "1",
                    error: "An error has occured. Please try again."
                })
            }
        }
    })
}

module.exports = {
    register
}