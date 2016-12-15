function startApp() {
    // Config
    const baseUrl = 'https://baas.kinvey.com/';
    const appId = 'kid_rJthRdqXg';
    const appPass = 'bcca271ffd8a4d7ea4a37d4b40c0ef98';
    const base64Auth = `${btoa(appId + ':' + appPass)}`;

    // Process
    bindMainMenuEvents();
    bindActionEvents();
    renderMainMenu();
    if (!isLoggedIn()) {
        renderView('viewAppHome');
    } else {
        renderView('viewUserHome');
        $("#spanMenuLoggedInUser").text("Welcome, " + sessionStorage.getItem("user"));
        $("#viewUserHomeHeading").text("Welcome, " + sessionStorage.getItem("user"));
    }

    /**
     * Bind events
     */
    function bindMainMenuEvents() {
        $('header a').on('click', (event) => {
            let name = formatViewName($(event.target).attr('id'), 4);
            renderView(name);
        });
    }

    function bindActionEvents() {
        $(document).on({
            ajaxStart: () => $('#loadingBox').show(),
            ajaxStop: () => {
                $('#loadingBox').hide()
            }
        });
        $("#linkUserHomeMyMessages").on('click', () => {
            showView("viewMyMessages");
            listAllMyMessages();
        });
        $("#linkUserHomeSendMessage").on('click', () => {
            showView("viewSendMessage");
            addUsersToSelect();
        });
        $("#linkUserHomeArchiveSent").on('click', () => {
            showView("viewArchiveSent");
            listArchive();
        });

        $("#linkMenuUserHome").on('click', () => showView("viewUserHome"));
        $("#linkMenuAppHome").on('click', () => showView("viewAppHome"));
        $("#linkMenuMyMessages").on('click', () => {
            showView("viewMyMessages");
            listAllMyMessages();
        });
        $("#linkMenuArchiveSent").on('click', () => {
            showView("viewArchiveSent");
            listArchive();
        });
        $("#linkMenuSendMessage").on('click', () => {
            showView("viewSendMessage");
            addUsersToSelect();
        });
        $("#linkMenuRegister").on('click', () => showView("viewRegister"));
        $("#linkMenuLogin").on('click', () => showView("viewLogin"));
        $("#linkMenuLogout").on('click', () => logout())

        $('#formRegister input[value="Register"]').on('click', () => processRegistration('#formRegister'));
        $('#formLogin input[value="Login"]').on('click', () => processLogin('#formLogin'));
        $('#formSendMessage input[value="Send"]').on('click', () => processCreateMessage('#formSendMessage'));
    }

    /**
     * Main logic
     */
    function processRegistration(formId) {
        event.preventDefault();

        let username = $(formId).find('#registerUsername').val().trim();
        let password = $(formId).find('#registerPasswd').val().trim();
        let name = $(formId).find('#registerName').val().trim();

        if (!isEmpty([username, password])) {
            clearInputs(formId);
            $.ajax({
                method: 'POST',
                url: baseUrl + 'user/' + appId,
                headers: {Authorization: `Basic ${base64Auth}`},
                contentType: 'application/json',
                data: JSON.stringify({username, password, name})
            })
                .then(completeRegistration)
                .catch(errorHandler)
        }

        function completeRegistration(userData) {
            updateSessionData(userData);
            renderMainMenu();
            renderView('viewUserHome');
            $("#spanMenuLoggedInUser").text("Welcome, " + sessionStorage.getItem("user"));
            $("#viewUserHomeHeading").text("Welcome, " + sessionStorage.getItem("user"));
            renderMessage('info', 'Successfully registered!');
        }
    }

    function processLogin(formId) {
        event.preventDefault();

        let username = $(formId).find('#loginUsername').val().trim();
        let password = $(formId).find('#loginPasswd').val().trim();

        if (!isEmpty([username, password])) {
            clearInputs(formId);
            $.ajax({
                method: 'POST',
                url: baseUrl + 'user/' + appId + '/login',
                headers: {Authorization: `Basic ${base64Auth}`},
                contentType: 'application/json',
                data: JSON.stringify({username, password})
            })
                .then(completeLogin)
                .catch(errorHandler)
        }

        function completeLogin(userData) {
            updateSessionData(userData);
            renderMainMenu();
            renderView('viewUserHome');
            $("#spanMenuLoggedInUser").text("Welcome, " + sessionStorage.getItem("user"));
            $("#viewUserHomeHeading").text("Welcome, " + sessionStorage.getItem("user"));
            renderMessage('info', 'Successfully logged in!');
        }
    }

    function processCreateMessage(formId) {
        event.preventDefault();

        let recipient = $(formId).find('#msgRecipientUsername option:selected').val().trim();
        let text = $(formId).find('#msgText').val().trim();

        $.ajax({
            method: 'POST',
            url: baseUrl + 'appdata/' + appId + '/messages',
            headers: {Authorization: `Kinvey ${sessionStorage.getItem('token')}`},
            contentType: 'application/json',
            data: JSON.stringify({
                sender_username: sessionStorage.getItem("user"),
                sender_name: sessionStorage.getItem("name"),
                recipient_username: recipient,
                text: text
            })
        })
            .then(completeMsgCreation)
            .catch(errorHandler);

        function completeMsgCreation() {
            clearInputs(formId);
            renderView('viewArchiveSent');
            listArchive();
            renderMessage('info', 'Message sent!');
        }
    }

    function listArchive() {

        let myArchivedMessages = $("#sentMessages tbody");
        myArchivedMessages.empty();

        $.ajax({
            method: "GET",
            url: baseUrl + "appdata/" + appId + "/messages?query=" + JSON.stringify({sender_username: sessionStorage.getItem("user")}),
            headers: {Authorization: `Kinvey ${sessionStorage.getItem('token')}`}
        })
            .then(listMyArchivedMessages)
            .catch(errorHandler);

        function listMyArchivedMessages(data) {
            for (let element of data) {
                let button = $("<button>Delete</button>");
                let tr = $("<tr>")
                    .append($("<td>").text(element.recipient_username))
                    .append($("<td>").text(element.text))
                    .append($("<td>").append(formatDate(element._kmd.lmt)))
                    .append($("<td>").append(button.on('click', function () {
                        deleteMsg(element);
                    })));
                myArchivedMessages.append(tr);
            }
        }
    }

    function listAllMyMessages() {
        let myMessages = $("#myMessages tbody");
        myMessages.empty();

        $.ajax({
            method: "GET",
            url: baseUrl + "appdata/" + appId + "/messages?query=" + JSON.stringify({recipient_username: sessionStorage.getItem("user")}),
            headers: {Authorization: `Kinvey ${sessionStorage.getItem('token')}`}
        })
            .then(listMyMessages)
            .catch(errorHandler);

        function listMyMessages(data) {
            for (let element of data) {
                let tr = $("<tr>")
                    .append($("<td>").text(formatSender(element.sender_username, element.sender_name)))
                    .append($("<td>").text(element.text))
                    .append($("<td>").append(formatDate(element._kmd.lmt)));
                myMessages.append(tr);
            }
        }
    }

    function addUsersToSelect() {
        let select = $("#msgRecipientUsername");
        select.empty();
        $.ajax({
            method: "GET",
            url: baseUrl + "user/" + appId + "/",
            headers: {Authorization: `Kinvey ${sessionStorage.getItem('token')}`}
        })
            .then(addOptions)
            .catch(errorHandler);

        function addOptions(arr) {
            for (let item of arr) {
                let option = $("<option>");
                option.text(`${item.username} (${item.name})`)
                option.attr("value", item.username);
                select.append(option);
            }
        }
    }

    function renderMainMenu() {
        $('#menu').find('a').hide();
        $('#menu').find('span').hide();
        if (!isLoggedIn()) {
            $('#linkMenuAppHome, #linkMenuLogin, #linkMenuRegister').show();
        } else {
            $('#linkMenuUserHome, #linkMenuMyMessages, #linkMenuArchiveSent, #linkMenuSendMessage, #linkMenuLogout, #spanMenuLoggedInUser').show();
        }
    }

    function renderView(name) {
        $('body section').hide();
        $('body section#' + name).show();
    }

    function deleteMsg(element) {
        $.ajax({
            method: "DELETE",
            url: baseUrl + "appdata/" + appId + "/messages/" + element._id,
            headers: {Authorization: `Kinvey ${sessionStorage.getItem('token')}`}
        })
            .then(successfulDelete)
            .catch(errorHandler);

        function successfulDelete() {
            showView("viewArchiveSent");
            listArchive();
        }
    }

    function logout() {
        $.ajax({
            method: 'POST',
            url: baseUrl + 'user/' + appId + '/_logout',
            headers: {Authorization: `Kinvey ${sessionStorage.getItem('token')}`}
        })
            .then(function () {
                sessionStorage.clear();
                renderMainMenu();
                renderView('viewAppHome');
                renderMessage('info', 'Successfully logged out!');
            })
            .catch(errorHandler);
    }

    function renderMessage(type, text, autoHide = true, clickToClose = true) {
        let box = $('#' + type + 'Box');
        box.text(text).fadeIn(500);

        if (clickToClose) {
            box.on('click', function () {
                $(this).fadeOut()
            });
        }

        if (autoHide) {
            setInterval(function () {
                box.fadeOut()
            }, 2500)
        }
    }

    /**
     * Helper functions
     */
    function isLoggedIn() {
        return sessionStorage.getItem('token') && sessionStorage.getItem('user');
    }

    function formatViewName(str, removeChars = 0) {
        str = str.substr(removeChars);
        return 'view' + str.charAt(0).toUpperCase() + str.slice(1);
    }

    function clearInputs(parentId) {
        $(parentId).find('input[name]').val('');
    }

    function isEmpty(params) {
        for (let param of params) {
            if (param === '') {
                return true;
            }
        }

        return false;
    }

    function formatDate(dateISO8601) {
        let date = new Date(dateISO8601);
        if (Number.isNaN(date.getDate()))
            return '';
        return date.getDate() + '.' + padZeros(date.getMonth() + 1) + "." + date.getFullYear() + ' ' + date.getHours() + ':' + padZeros(date.getMinutes()) + ':' + padZeros(date.getSeconds());
        function padZeros(num) {
            return ('0' + num).slice(-2);
        }
    }

    function formatSender(name, username) {
        if (!name)
            return username;
        else
            return username + ' (' + name + ')';
    }

    function showView(view) {
        $('main > section').hide();
        $(`#${view}`).show();
    }

    function updateSessionData(userData) {
        sessionStorage.clear();
        sessionStorage.setItem('user', userData.username);
        sessionStorage.setItem('name', userData.name);
        sessionStorage.setItem('userId', userData._id);
        sessionStorage.setItem('token', userData._kmd.authtoken);
    }

    function errorHandler(response) {
        let errorMsg = JSON.stringify(response);
        if (response.readyState === 0) {
            errorMsg = "Cannot connect due to network error.";
        }
        if (response.responseJSON &&
            response.responseJSON.description) {
            errorMsg = response.responseJSON.description;
        }

        renderMessage('error', errorMsg, false);
    }
}